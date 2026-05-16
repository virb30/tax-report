import {
  AssetResolutionStatus,
  type AssetTypeOverrideDecision,
  AssetTypeSource,
  type ImportPreviewReviewState,
  type ImportPreviewSummary,
  SourceType,
  TransactionType,
} from '../../../shared/types/domain';
import type { AssetType } from '../../../shared/types/domain';
import type { ConsolidatedPositionParserPort } from '../interfaces/consolidated-position-parser.port';
import type { AssetRepository } from '../../../portfolio/application/repositories/asset.repository';
import type { BrokerRepository } from '../../../portfolio/application/repositories/broker.repository';
import type { TransactionRepository } from '../../../portfolio/application/repositories/transaction.repository';
import { Transaction } from '../../../portfolio/domain/entities/transaction.entity';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import type { Queue } from '../../../shared/infra/events/queue.interface';
import { ConsolidatedPositionImportedEvent } from '../../../shared/domain/events/consolidated-position-imported.event';
import { assertSupportedYear } from '../../../shared/utils/year';
import type { ConsolidatedPositionRow } from '../interfaces/consolidated-position-parser.port';
import type { Broker } from '../../../portfolio/domain/entities/broker.entity';
import { Asset } from '../../../portfolio/domain/entities/asset.entity';
import { ImportConfirmReviewResolver } from '../../domain/services/import-confirm-review-resolver.service';
import { ImportPreviewReviewResolver } from '../../domain/services/import-preview-review-resolver.service';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';
import { Quantity } from '../../../portfolio/domain/value-objects/quantity.vo';

type ResolvedRow = {
  ticker: string;
  quantity: number;
  averagePrice: number;
  brokerId: string;
};

type AcceptedConsolidatedRow = ConsolidatedPositionRow & {
  resolvedAssetType: AssetType;
  resolutionStatus: AssetResolutionStatus;
};

type AssetCatalogMap = Map<
  string,
  NonNullable<Awaited<ReturnType<AssetRepository['findByTickersList']>>[number]>
>;

export type ImportConsolidatedPositionInput = {
  filePath: string;
  year: number;
  assetTypeOverrides: AssetTypeOverrideDecision[];
};

export type ImportConsolidatedPositionOutput = {
  importedCount: number;
  recalculatedTickers: string[];
  skippedUnsupportedRows: number;
};

export type PreviewConsolidatedPositionInput = {
  filePath: string;
};

export type ConsolidatedPositionPreviewRow = ImportPreviewReviewState & {
  ticker: string;
  quantity: number;
  averagePrice: number;
  brokerCode: string;
  sourceAssetType: AssetType | null;
};

export type PreviewConsolidatedPositionOutput = {
  rows: ConsolidatedPositionPreviewRow[];
  summary: ImportPreviewSummary;
};

export class ImportConsolidatedPositionUseCase {
  constructor(
    private readonly parser: ConsolidatedPositionParserPort,
    private readonly assetRepository: AssetRepository,
    private readonly brokerRepository: BrokerRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly queue: Queue,
    private readonly reviewResolver: ImportPreviewReviewResolver = new ImportPreviewReviewResolver(),
    private readonly confirmReviewResolver: ImportConfirmReviewResolver = new ImportConfirmReviewResolver(),
  ) {}

  async preview(
    input: PreviewConsolidatedPositionInput,
  ): Promise<PreviewConsolidatedPositionOutput> {
    this.validatePreviewInput(input);
    const rows = await this.parser.parse(input.filePath);
    const assetCatalogMap = await this.loadAssetCatalogMap(rows);
    const summary = {
      supportedRows: 0,
      pendingRows: 0,
      unsupportedRows: 0,
    };
    const previewRows = rows.map((row) => this.buildPreviewRow(row, assetCatalogMap, summary));

    return {
      rows: previewRows,
      summary,
    };
  }

  async execute(input: ImportConsolidatedPositionInput): Promise<ImportConsolidatedPositionOutput> {
    this.validateExecuteInput(input);

    const rows = await this.parser.parse(input.filePath);
    const assetCatalogMap = await this.loadAssetCatalogMap(rows);
    const { acceptedRows, skippedUnsupportedRows } = this.resolveSupportedRows(
      rows,
      assetCatalogMap,
      input.assetTypeOverrides,
    );
    const resolved = await this.resolveBrokers(acceptedRows);
    const grouped = this.groupByTickerAndBroker(resolved);
    await this.persistAcceptedCatalogUpdates(acceptedRows, assetCatalogMap);

    const tickers = this.extractUniqueTickers(grouped);
    await this.replaceInitialBalanceRows(grouped, tickers, input.year);

    return {
      importedCount: grouped.length,
      recalculatedTickers: tickers,
      skippedUnsupportedRows,
    };
  }

  private extractUniqueTickers(rows: ResolvedRow[]): string[] {
    return [...new Set(rows.map((row) => row.ticker))];
  }

  private async replaceInitialBalanceRows(
    rows: ResolvedRow[],
    tickers: string[],
    year: number,
  ): Promise<void> {
    for (const ticker of tickers) {
      await this.transactionRepository.deleteInitialBalanceByTickerAndYear(ticker, year);

      const transactions = rows
        .filter((row) => row.ticker === ticker)
        .map((row) => this.createInitialBalanceTransaction(row, year));

      await this.transactionRepository.saveMany(transactions);
      await this.queue.publish(new ConsolidatedPositionImportedEvent({ ticker, year }));
    }
  }

  private createInitialBalanceTransaction(row: ResolvedRow, year: number): Transaction {
    return Transaction.create({
      date: `${year}-01-01`,
      type: TransactionType.InitialBalance,
      ticker: row.ticker,
      quantity: Quantity.from(row.quantity),
      unitPrice: Money.from(row.averagePrice),
      fees: Money.from(0),
      brokerId: Uuid.from(row.brokerId),
      sourceType: SourceType.Csv,
    });
  }

  private validatePreviewInput(input: PreviewConsolidatedPositionInput): void {
    if (typeof input.filePath !== 'string' || input.filePath.trim().length === 0) {
      throw new Error('Caminho do arquivo inválido.');
    }
  }

  private validateExecuteInput(input: ImportConsolidatedPositionInput): void {
    assertSupportedYear(input.year, {
      invalidTypeMessage: 'Ano inválido.',
      outOfRangeMessage: 'Ano deve estar entre 2000 e 2100.',
    });
    this.validatePreviewInput(input);
  }

  private resolveSupportedRows(
    rows: ConsolidatedPositionRow[],
    assetCatalogMap: AssetCatalogMap,
    overrides: ImportConsolidatedPositionInput['assetTypeOverrides'],
  ): {
    acceptedRows: AcceptedConsolidatedRow[];
    skippedUnsupportedRows: number;
  } {
    const overridesByTicker = this.buildOverridesMap(overrides);
    const acceptedRows: AcceptedConsolidatedRow[] = [];
    const unresolvedTickers = new Set<string>();
    let skippedUnsupportedRows = 0;

    for (const row of rows) {
      const acceptedRow = this.resolveAcceptedRow({
        row,
        assetCatalogMap,
        overridesByTicker,
        unresolvedTickers,
      });

      if (acceptedRow === 'unsupported') {
        skippedUnsupportedRows += 1;
        continue;
      }

      if (!acceptedRow) {
        continue;
      }

      acceptedRows.push(acceptedRow);
    }

    this.ensureNoUnresolvedSupportedRows(unresolvedTickers);

    return {
      acceptedRows,
      skippedUnsupportedRows,
    };
  }

  private buildPreviewRow(
    row: ConsolidatedPositionRow,
    assetCatalogMap: AssetCatalogMap,
    summary: PreviewConsolidatedPositionOutput['summary'],
  ): PreviewConsolidatedPositionOutput['rows'][number] {
    const previewRow = {
      ticker: row.ticker,
      quantity: row.quantity,
      averagePrice: row.averagePrice,
      brokerCode: row.brokerCode,
      sourceAssetType: row.sourceAssetType,
      ...this.reviewResolver.resolve({
        fileAssetType: row.sourceAssetType,
        fileAssetTypeLabel: row.sourceAssetTypeLabel,
        catalogAssetType: assetCatalogMap.get(row.ticker)?.assetType ?? null,
        hasSupportedEvent: true,
      }),
    };

    this.updateSummary(summary, previewRow);
    return previewRow;
  }

  private buildOverridesMap(
    overrides: ImportConsolidatedPositionInput['assetTypeOverrides'],
  ): Map<string, AssetType> {
    return new Map(overrides.map((override) => [override.ticker, override.assetType]));
  }

  private resolveAcceptedRow(input: {
    row: ConsolidatedPositionRow;
    assetCatalogMap: AssetCatalogMap;
    overridesByTicker: Map<string, AssetType>;
    unresolvedTickers: Set<string>;
  }): AcceptedConsolidatedRow | 'unsupported' | null {
    const reviewState = this.confirmReviewResolver.resolve({
      fileAssetType: input.row.sourceAssetType,
      fileAssetTypeLabel: input.row.sourceAssetTypeLabel,
      catalogAssetType: input.assetCatalogMap.get(input.row.ticker)?.assetType ?? null,
      hasSupportedEvent: true,
      overrideAssetType: input.overridesByTicker.get(input.row.ticker) ?? null,
    });

    if (reviewState.unsupportedReason) {
      return 'unsupported';
    }

    if (reviewState.needsReview || !reviewState.resolvedAssetType) {
      input.unresolvedTickers.add(input.row.ticker);
      return null;
    }

    return {
      ...input.row,
      resolvedAssetType: reviewState.resolvedAssetType,
      resolutionStatus: reviewState.resolutionStatus,
    };
  }

  private async resolveBrokers(rows: ConsolidatedPositionRow[]): Promise<ResolvedRow[]> {
    const brokerMap = await this.loadBrokerMap(rows);

    return rows.map((row) => ({
      ticker: row.ticker,
      quantity: row.quantity,
      averagePrice: row.averagePrice,
      brokerId: this.requireBroker(brokerMap, row.brokerCode).id.value,
    }));
  }

  private async loadBrokerMap(rows: ConsolidatedPositionRow[]): Promise<Map<string, Broker>> {
    const uniqueCodes = [...new Set(rows.map((row) => row.brokerCode.trim().toUpperCase()))];
    const brokers = await this.brokerRepository.findAllByCodes(uniqueCodes);

    return new Map(brokers.map((broker) => [broker.code.trim().toUpperCase(), broker]));
  }

  private requireBroker(brokerMap: Map<string, Broker>, brokerCode: string): Broker {
    const normalizedBrokerCode = brokerCode.trim().toUpperCase();
    const broker = brokerMap.get(normalizedBrokerCode);

    if (!broker) {
      throw new Error(
        `Corretora com codigo '${brokerCode}' nao encontrada. Cadastre-a em Corretoras antes de importar.`,
      );
    }

    return broker;
  }

  private groupByTickerAndBroker(rows: ResolvedRow[]): ResolvedRow[] {
    const map = new Map<string, ResolvedRow>();

    for (const row of rows) {
      const key = `${row.ticker}::${row.brokerId}`;
      map.set(key, row);
    }

    return [...map.values()];
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
    acceptedRows: AcceptedConsolidatedRow[],
    assetCatalogMap: AssetCatalogMap,
  ): Promise<void> {
    const decisions = new Map<
      string,
      {
        assetType: AssetType;
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

  private async loadAssetCatalogMap(rows: ConsolidatedPositionRow[]): Promise<AssetCatalogMap> {
    const tickers = [...new Set(rows.map((row) => row.ticker))];
    const assets = await this.assetRepository.findByTickersList(tickers);
    return new Map(assets.map((asset) => [asset.ticker, asset]));
  }

  private updateSummary(
    summary: PreviewConsolidatedPositionOutput['summary'],
    row: PreviewConsolidatedPositionOutput['rows'][number],
  ): void {
    if (row.unsupportedReason) {
      summary.unsupportedRows += 1;
      return;
    }

    summary.supportedRows += 1;
    if (row.needsReview) {
      summary.pendingRows += 1;
    }
  }
}
