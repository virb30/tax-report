import { randomUUID } from 'node:crypto';
import {
  AssetResolutionStatus,
  AssetTypeSource,
  SourceType,
} from '../../../../shared/types/domain';
import type { AssetType } from '../../../../shared/types/domain';
import { Transaction } from '../../../domain/portfolio/entities/transaction.entity';
import { Uuid } from '../../../domain/shared/uuid.vo';
import { Asset } from '../../../domain/portfolio/entities/asset.entity';
import type { TaxApportioner } from '../../../domain/ingestion/tax-apportioner.service';
import type { ImportTransactionsParser } from '../../interfaces/transactions.parser.interface';
import type { AssetRepository } from '../../repositories/asset.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import type { Queue } from '../../events/queue.interface';
import type {
  ConfirmImportTransactionsCommand,
  ConfirmImportTransactionsResult,
} from '../../../../shared/contracts/preview-import.contract';
import { TransactionsImportedEvent } from '../../../domain/events/transactions-imported.event';
import { ImportConfirmReviewResolver } from '../../../domain/ingestion/import-confirm-review-resolver.service';
import { Money } from '../../../domain/portfolio/value-objects/money.vo';
import { Quantity } from '../../../domain/portfolio/value-objects/quantity.vo';

type ParsedTransactionImportFile = Awaited<ReturnType<ImportTransactionsParser['parse']>>;

type AcceptedTransactionImport = {
  tradeDate: string;
  type: Transaction['type'];
  ticker: string;
  quantity: number;
  unitPrice: number;
  fees: number;
  brokerId: string;
  resolvedAssetType: AssetType;
  resolutionStatus: AssetResolutionStatus;
};

type ResolveAcceptedRowsResult = {
  acceptedRows: AcceptedTransactionImport[];
  skippedUnsupportedRows: number;
};

export class ImportTransactionsUseCase {
  constructor(
    private readonly parser: ImportTransactionsParser,
    private readonly taxApportioner: TaxApportioner,
    private readonly assetRepository: AssetRepository,
    private readonly transactionRepository: TransactionRepository,
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

    const tickerYears = await this.publishImportedEvents(newTransactions);

    return {
      importedCount: newTransactions.length,
      recalculatedTickers: [...tickerYears.keys()],
      skippedUnsupportedRows,
    };
  }

  private resolveAcceptedRows(
    parsedFile: ParsedTransactionImportFile,
    assetCatalogMap: Map<
      string,
      NonNullable<Awaited<ReturnType<AssetRepository['findByTickersList']>>[number]>
    >,
    overrides: ConfirmImportTransactionsCommand['assetTypeOverrides'],
  ): ResolveAcceptedRowsResult {
    const overridesByTicker = new Map(
      overrides.map((override) => [override.ticker, override.assetType]),
    );
    const acceptedRows: AcceptedTransactionImport[] = [];
    const unresolvedTickers = new Set<string>();
    let skippedUnsupportedRows = parsedFile.unsupportedRows.length;

    for (const batch of parsedFile.batches) {
      const allocatedFees = this.taxApportioner.allocate({
        totalOperationalCosts: batch.totalOperationalCosts,
        operations: batch.operations.map((op) => ({
          ticker: op.ticker,
          quantity: op.quantity,
          unitPrice: op.unitPrice,
        })),
      });

      for (let i = 0; i < batch.operations.length; i += 1) {
        const op = batch.operations[i];
        const fees = allocatedFees[i] ?? 0;
        if (!op) {
          continue;
        }

        const reviewState = this.reviewResolver.resolve({
          fileAssetType: op.sourceAssetType,
          fileAssetTypeLabel: op.sourceAssetTypeLabel,
          catalogAssetType: assetCatalogMap.get(op.ticker)?.assetType ?? null,
          hasSupportedEvent: true,
          overrideAssetType: overridesByTicker.get(op.ticker) ?? null,
        });

        if (reviewState.unsupportedReason) {
          skippedUnsupportedRows += 1;
          continue;
        }

        if (reviewState.needsReview || !reviewState.resolvedAssetType) {
          unresolvedTickers.add(op.ticker);
          continue;
        }

        acceptedRows.push({
          tradeDate: batch.tradeDate,
          type: op.type,
          ticker: op.ticker,
          quantity: op.quantity,
          unitPrice: op.unitPrice,
          fees,
          brokerId: batch.brokerId,
          resolvedAssetType: reviewState.resolvedAssetType,
          resolutionStatus: reviewState.resolutionStatus,
        });
      }
    }

    this.ensureNoUnresolvedSupportedRows(unresolvedTickers);

    return {
      acceptedRows,
      skippedUnsupportedRows,
    };
  }

  private createTransaction(row: AcceptedTransactionImport, importBatchId: string): Transaction {
    return Transaction.create({
      date: row.tradeDate,
      type: row.type,
      ticker: row.ticker,
      quantity: Quantity.from(row.quantity),
      unitPrice: Money.from(row.unitPrice),
      fees: Money.from(row.fees),
      brokerId: Uuid.from(row.brokerId),
      sourceType: SourceType.Csv,
      externalRef: createExternalRef({
        tradeDate: row.tradeDate,
        type: row.type,
        ticker: row.ticker,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        fees: row.fees,
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

  private async publishImportedEvents(
    newTransactions: Transaction[],
  ): Promise<Map<string, Set<number>>> {
    const tickerYears = new Map<string, Set<number>>();

    for (const tx of newTransactions) {
      const year = parseInt(tx.date.slice(0, 4), 10);
      if (!tickerYears.has(tx.ticker)) {
        tickerYears.set(tx.ticker, new Set());
      }
      tickerYears.get(tx.ticker)!.add(year);
    }
    for (const [ticker, years] of tickerYears) {
      for (const year of years) {
        const event = new TransactionsImportedEvent({ ticker, year });
        await this.queue.publish(event);
      }
    }

    return tickerYears;
  }

  private async loadAssetCatalogMap(
    parsedFile: ParsedTransactionImportFile,
  ): Promise<
    Map<string, NonNullable<Awaited<ReturnType<AssetRepository['findByTickersList']>>[number]>>
  > {
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
    assetCatalogMap: Map<
      string,
      NonNullable<Awaited<ReturnType<AssetRepository['findByTickersList']>>[number]>
    >,
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
}

function createExternalRef(input: {
  tradeDate: string;
  type: Transaction['type'];
  ticker: string;
  quantity: number;
  unitPrice: number;
  fees: number;
  brokerId: string;
  sourceType: SourceType;
}): string {
  return [
    input.tradeDate,
    input.type,
    input.ticker,
    input.quantity.toString(),
    input.unitPrice.toFixed(8),
    input.fees.toFixed(8),
    input.brokerId,
    input.sourceType,
  ].join('|');
}
