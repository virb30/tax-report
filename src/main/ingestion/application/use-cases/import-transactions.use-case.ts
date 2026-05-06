import { randomUUID } from 'node:crypto';
import {
  AssetResolutionStatus,
  AssetTypeSource,
  SourceType,
} from '../../../../shared/types/domain';
import type { AssetType } from '../../../../shared/types/domain';
import { Transaction } from '../../../portfolio/domain/entities/transaction.entity';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { Asset } from '../../../portfolio/domain/entities/asset.entity';
import type { ImportTransactionsParser } from '../interfaces/transactions.parser.interface';
import type { AssetRepository } from '../../../portfolio/application/repositories/asset.repository';
import type { TransactionRepository } from '../../../portfolio/application/repositories/transaction.repository';
import type {
  ConfirmImportTransactionsCommand,
  ConfirmImportTransactionsResult,
} from '../../../../preload/contracts/ingestion/preview-import.contract';
import { ImportConfirmReviewResolver } from '../../domain/services/import-confirm-review-resolver.service';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';
import { Quantity } from '../../../portfolio/domain/value-objects/quantity.vo';
import type {
  ReallocatedTransactionFeePosition,
  ReallocateTransactionFeesService,
} from '../services/reallocate-transaction-fees.service';
import type { Queue } from '../../../shared/application/events/queue.interface';
import { TransactionsImportedEvent } from '../../../shared/domain/events/transactions-imported.event';

type ParsedTransactionImportFile = Awaited<ReturnType<ImportTransactionsParser['parse']>>;

type AcceptedTransactionImport = {
  tradeDate: string;
  type: Transaction['type'];
  ticker: string;
  quantity: number;
  unitPrice: number;
  brokerId: string;
  resolvedAssetType: AssetType;
  resolutionStatus: AssetResolutionStatus;
};

type ResolveAcceptedRowsResult = {
  acceptedRows: AcceptedTransactionImport[];
  skippedUnsupportedRows: number;
};

type AssetCatalogMap = Map<
  string,
  NonNullable<Awaited<ReturnType<AssetRepository['findByTickersList']>>[number]>
>;

export class ImportTransactionsUseCase {
  constructor(
    private readonly parser: ImportTransactionsParser,
    private readonly assetRepository: AssetRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly reallocateTransactionFeesService: ReallocateTransactionFeesService,
    private readonly queue: Queue,
    private readonly reviewResolver: ImportConfirmReviewResolver = new ImportConfirmReviewResolver(),
  ) {}

  async execute(input: ConfirmImportTransactionsCommand): Promise<ConfirmImportTransactionsResult> {
    const parsedFile = await this.parser.parse(input.filePath);
    const assetCatalogMap = await this.loadAssetCatalogMap(parsedFile);
    const { acceptedRows, skippedUnsupportedRows } = this.resolveAcceptedRows(
      parsedFile,
      assetCatalogMap,
      input.assetTypeOverrides,
    );
    const importBatchId = `batch-${Date.now()}-${randomUUID().slice(0, 8)}`;

    await this.persistAcceptedCatalogUpdates(acceptedRows, assetCatalogMap);

    const allTransactions = acceptedRows.map((row) => this.createTransaction(row, importBatchId));
    const newTransactions = await this.filterNewTransactions(allTransactions);

    if (newTransactions.length > 0) {
      await this.transactionRepository.saveMany(newTransactions);
    }

    const affectedPositions = await this.reallocateAffectedFees(newTransactions);
    await this.publishTransactionsImported(affectedPositions);

    return {
      importedCount: newTransactions.length,
      recalculatedTickers: [...new Set(affectedPositions.map((position) => position.ticker))],
      skippedUnsupportedRows,
    };
  }

  private resolveAcceptedRows(
    parsedFile: ParsedTransactionImportFile,
    assetCatalogMap: AssetCatalogMap,
    overrides: ConfirmImportTransactionsCommand['assetTypeOverrides'],
  ): ResolveAcceptedRowsResult {
    const overridesByTicker = this.buildOverridesMap(overrides);
    const acceptedRows: AcceptedTransactionImport[] = [];
    const unresolvedTickers = new Set<string>();
    let skippedUnsupportedRows = parsedFile.unsupportedRows.length;

    for (const batch of parsedFile.batches) {
      for (const op of batch.operations) {
        const resolvedRow = this.resolveAcceptedOperation({
          op,
          tradeDate: batch.tradeDate,
          brokerId: batch.brokerId,
          assetCatalogMap,
          overridesByTicker,
          unresolvedTickers,
        });

        if (resolvedRow === 'unsupported') {
          skippedUnsupportedRows += 1;
          continue;
        }

        if (!resolvedRow) {
          continue;
        }

        acceptedRows.push(resolvedRow);
      }
    }

    this.ensureNoUnresolvedSupportedRows(unresolvedTickers);

    return {
      acceptedRows,
      skippedUnsupportedRows,
    };
  }

  private buildOverridesMap(
    overrides: ConfirmImportTransactionsCommand['assetTypeOverrides'],
  ): Map<string, AssetType> {
    return new Map(overrides.map((override) => [override.ticker, override.assetType]));
  }

  private resolveAcceptedOperation(input: {
    op: ParsedTransactionImportFile['batches'][number]['operations'][number];
    tradeDate: string;
    brokerId: string;
    assetCatalogMap: AssetCatalogMap;
    overridesByTicker: Map<string, AssetType>;
    unresolvedTickers: Set<string>;
  }): AcceptedTransactionImport | 'unsupported' | null {
    const reviewState = this.reviewResolver.resolve({
      fileAssetType: input.op.sourceAssetType,
      fileAssetTypeLabel: input.op.sourceAssetTypeLabel,
      catalogAssetType: input.assetCatalogMap.get(input.op.ticker)?.assetType ?? null,
      hasSupportedEvent: true,
      overrideAssetType: input.overridesByTicker.get(input.op.ticker) ?? null,
    });

    if (reviewState.unsupportedReason) {
      return 'unsupported';
    }

    if (reviewState.needsReview || !reviewState.resolvedAssetType) {
      input.unresolvedTickers.add(input.op.ticker);
      return null;
    }

    return {
      tradeDate: input.tradeDate,
      type: input.op.type,
      ticker: input.op.ticker,
      quantity: input.op.quantity,
      unitPrice: input.op.unitPrice,
      brokerId: input.brokerId,
      resolvedAssetType: reviewState.resolvedAssetType,
      resolutionStatus: reviewState.resolutionStatus,
    };
  }

  private createTransaction(row: AcceptedTransactionImport, importBatchId: string): Transaction {
    return Transaction.create({
      date: row.tradeDate,
      type: row.type,
      ticker: row.ticker,
      quantity: Quantity.from(row.quantity),
      unitPrice: Money.from(row.unitPrice),
      fees: Money.from(0),
      brokerId: Uuid.from(row.brokerId),
      sourceType: SourceType.Csv,
      externalRef: createExternalRef({
        tradeDate: row.tradeDate,
        type: row.type,
        ticker: row.ticker,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        brokerId: row.brokerId,
        sourceType: SourceType.Csv,
      }),
      importBatchId,
    });
  }

  private async filterNewTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const existingRefs = await this.transactionRepository.findExistingExternalRefs(
      transactions
        .map((transaction) => transaction.externalRef)
        .filter((externalRef): externalRef is string => Boolean(externalRef)),
    );

    return transactions.filter((transaction) => !existingRefs.has(transaction.externalRef ?? ''));
  }

  private async loadAssetCatalogMap(
    parsedFile: ParsedTransactionImportFile,
  ): Promise<AssetCatalogMap> {
    const tickers = new Set<string>();

    for (const batch of parsedFile.batches) {
      for (const operation of batch.operations) {
        tickers.add(operation.ticker);
      }
    }

    for (const row of parsedFile.unsupportedRows) {
      tickers.add(row.ticker);
    }

    const assets = await this.assetRepository.findByTickersList([...tickers]);
    return new Map(assets.map((asset) => [asset.ticker, asset]));
  }

  private ensureNoUnresolvedSupportedRows(unresolvedTickers: Set<string>): void {
    if (unresolvedTickers.size === 0) {
      return;
    }

    const tickers = [...unresolvedTickers].sort();
    throw new Error(
      `Existem linhas suportadas sem tipo de ativo resolvido para: ${tickers.join(', ')}. Informe um tipo de ativo antes de confirmar.`,
    );
  }

  private async persistAcceptedCatalogUpdates(
    acceptedRows: AcceptedTransactionImport[],
    assetCatalogMap: AssetCatalogMap,
  ): Promise<void> {
    const decisions = new Map<
      string,
      {
        assetType: AcceptedTransactionImport['resolvedAssetType'];
        resolutionSource: AssetTypeSource;
      }
    >();

    for (const row of acceptedRows) {
      const resolutionSource = this.mapResolutionSource(row.resolutionStatus);
      if (!resolutionSource) {
        continue;
      }

      decisions.set(row.ticker, {
        assetType: row.resolvedAssetType,
        resolutionSource,
      });
    }

    for (const [ticker, decision] of decisions) {
      const asset = assetCatalogMap.get(ticker) ?? Asset.create({ ticker });
      asset.changeAssetType(decision.assetType, decision.resolutionSource);
      await this.assetRepository.save(asset);
      assetCatalogMap.set(ticker, asset);
    }
  }

  private mapResolutionSource(status: AssetResolutionStatus): AssetTypeSource | null {
    if (status === AssetResolutionStatus.ResolvedFromFile) {
      return AssetTypeSource.File;
    }

    if (status === AssetResolutionStatus.ManualOverride) {
      return AssetTypeSource.Manual;
    }

    return null;
  }

  private async reallocateAffectedFees(
    newTransactions: Transaction[],
  ): Promise<ReallocatedTransactionFeePosition[]> {
    const affectedDatesByBroker = new Map<string, { date: string; brokerId: string }>();
    const affectedPositions = new Map<string, ReallocatedTransactionFeePosition>();

    for (const transaction of newTransactions) {
      affectedDatesByBroker.set(`${transaction.date}::${transaction.brokerId.value}`, {
        date: transaction.date,
        brokerId: transaction.brokerId.value,
      });
    }

    for (const affectedDate of affectedDatesByBroker.values()) {
      const reallocation = await this.reallocateTransactionFeesService.execute(affectedDate);
      for (const position of reallocation.affectedPositions) {
        affectedPositions.set(`${position.ticker}::${position.year}`, position);
      }
    }

    return [...affectedPositions.values()];
  }

  private async publishTransactionsImported(
    affectedPositions: ReallocatedTransactionFeePosition[],
  ): Promise<void> {
    for (const position of affectedPositions) {
      await this.queue.publish(new TransactionsImportedEvent(position));
    }
  }
}

function createExternalRef(input: {
  tradeDate: string;
  type: Transaction['type'];
  ticker: string;
  quantity: number;
  unitPrice: number;
  brokerId: string;
  sourceType: SourceType;
}): string {
  return [
    input.tradeDate,
    input.type,
    input.ticker,
    input.quantity.toString(),
    input.unitPrice.toFixed(8),
    input.brokerId,
    input.sourceType,
  ].join('|');
}
