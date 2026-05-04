import type { ImportTransactionsParser } from '../../interfaces/transactions.parser.interface';
import type { TransactionFeeAllocator } from '../../../../portfolio/domain/services/transaction-fee-allocator.service';
import type { AssetRepository } from '../../../../portfolio/application/repositories/asset.repository';
import type { DailyBrokerTaxRepository } from '../../repositories/daily-broker-tax.repository';
import { Uuid } from '../../../../shared/domain/value-objects/uuid.vo';
import type {
  PreviewImportTransactionsCommand,
  PreviewImportTransactionsResult,
  PreviewTransactionItem,
  PreviewImportWarning,
} from '../../../../../preload/contracts/ingestion/preview-import.contract';
import { TransactionType } from '../../../../../shared/types/domain';
import { ImportPreviewReviewResolver } from '../../../domain/services/import-preview-review-resolver.service';
import { Money } from '../../../../portfolio/domain/value-objects/money.vo';

export class PreviewImportUseCase {
  constructor(
    private readonly parser: ImportTransactionsParser,
    private readonly transactionFeeAllocator: TransactionFeeAllocator,
    private readonly dailyBrokerTaxRepository: DailyBrokerTaxRepository,
    private readonly assetRepository: AssetRepository,
    private readonly reviewResolver: ImportPreviewReviewResolver = new ImportPreviewReviewResolver(),
  ) {}

  async execute(input: PreviewImportTransactionsCommand): Promise<PreviewImportTransactionsResult> {
    const parsedFile = await this.parser.parse(input.filePath);
    const batches = parsedFile.batches;
    const assetCatalogMap = await this.loadAssetCatalogMap(parsedFile);
    const dailyTaxFeesMap = await this.loadDailyTaxFeesMap(parsedFile);
    const transactionsPreview: PreviewTransactionItem[] = [];
    const warnings: PreviewImportWarning[] = [];
    const summary = {
      supportedRows: 0,
      pendingRows: 0,
      unsupportedRows: 0,
    };
    let globalRowIndex = 1;

    for (const batch of batches) {
      const allocatedFees = this.transactionFeeAllocator.allocate({
        totalOperationalCosts:
          dailyTaxFeesMap.get(this.toDailyTaxKey(batch.tradeDate, batch.brokerId)) ?? Money.from(0),
        operations: batch.operations.map((op) => ({
          ticker: op.ticker,
          quantity: op.quantity,
          unitPrice: Money.from(op.unitPrice),
          type: op.type,
        })),
      });

      for (let i = 0; i < batch.operations.length; i += 1) {
        const op = batch.operations[i];
        const fees = allocatedFees[i]?.toNumber() ?? 0;
        if (!op) {
          continue;
        }

        if (op.type === TransactionType.Bonus && (!op.unitPrice || op.unitPrice <= 0)) {
          warnings.push({
            row: globalRowIndex,
            message: `A bonificação do ativo ${op.ticker} está com custo unitário zerado. É recomendado informar o custo unitário conforme fato relevante.`,
            type: 'BONUS_MISSING_COST',
          });
        }

        const previewItem: PreviewTransactionItem = {
          date: batch.tradeDate,
          ticker: op.ticker,
          type: op.type,
          quantity: op.quantity,
          unitPrice: op.unitPrice,
          fees,
          brokerId: batch.brokerId,
          sourceAssetType: op.sourceAssetType,
          ...this.resolveReviewState({
            ticker: op.ticker,
            fileAssetType: op.sourceAssetType,
            fileAssetTypeLabel: op.sourceAssetTypeLabel,
            hasSupportedEvent: true,
            assetCatalogMap,
          }),
        };

        transactionsPreview.push(previewItem);
        this.updateSummary(summary, previewItem);

        globalRowIndex += 1;
      }
    }

    for (const row of parsedFile.unsupportedRows) {
      const previewItem: PreviewTransactionItem = {
        date: row.date,
        ticker: row.ticker,
        type: null,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        fees: 0,
        brokerId: row.brokerId,
        sourceAssetType: row.sourceAssetType,
        ...this.resolveReviewState({
          ticker: row.ticker,
          fileAssetType: row.sourceAssetType,
          fileAssetTypeLabel: row.sourceAssetTypeLabel,
          hasSupportedEvent: false,
          assetCatalogMap,
        }),
      };

      transactionsPreview.push(previewItem);
      this.updateSummary(summary, previewItem);
    }

    return {
      batches,
      transactionsPreview,
      summary,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private async loadAssetCatalogMap(
    parsedFile: Awaited<ReturnType<ImportTransactionsParser['parse']>>,
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

  private async loadDailyTaxFeesMap(
    parsedFile: Awaited<ReturnType<ImportTransactionsParser['parse']>>,
  ): Promise<Map<string, Money>> {
    const keys = new Map<string, { date: string; brokerId: string }>();

    for (const batch of parsedFile.batches) {
      keys.set(this.toDailyTaxKey(batch.tradeDate, batch.brokerId), {
        date: batch.tradeDate,
        brokerId: batch.brokerId,
      });
    }

    const feesMap = new Map<string, Money>();
    for (const key of keys.values()) {
      const tax = await this.dailyBrokerTaxRepository.findByDateAndBroker({
        date: key.date,
        brokerId: Uuid.from(key.brokerId),
      });
      feesMap.set(this.toDailyTaxKey(key.date, key.brokerId), tax?.fees ?? Money.from(0));
    }

    return feesMap;
  }

  private toDailyTaxKey(date: string, brokerId: string): string {
    return `${date}::${brokerId}`;
  }

  private resolveReviewState(input: {
    ticker: string;
    fileAssetType: PreviewTransactionItem['sourceAssetType'];
    fileAssetTypeLabel: string | null;
    hasSupportedEvent: boolean;
    assetCatalogMap: Map<
      string,
      NonNullable<Awaited<ReturnType<AssetRepository['findByTickersList']>>[number]>
    >;
  }) {
    return this.reviewResolver.resolve({
      fileAssetType: input.fileAssetType,
      fileAssetTypeLabel: input.fileAssetTypeLabel,
      catalogAssetType: input.assetCatalogMap.get(input.ticker)?.assetType ?? null,
      hasSupportedEvent: input.hasSupportedEvent,
    });
  }

  private updateSummary(
    summary: PreviewImportTransactionsResult['summary'],
    item: PreviewTransactionItem,
  ): void {
    if (item.unsupportedReason) {
      summary.unsupportedRows += 1;
      return;
    }

    summary.supportedRows += 1;
    if (item.needsReview) {
      summary.pendingRows += 1;
    }
  }
}
