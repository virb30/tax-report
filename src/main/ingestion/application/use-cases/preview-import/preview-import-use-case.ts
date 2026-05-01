import type { ImportTransactionsParser } from '../../interfaces/transactions.parser.interface';
import type { TaxApportioner } from '../../../domain/services/tax-apportioner.service';
import type { AssetRepository } from '../../../../portfolio/application/repositories/asset.repository';
import type {
  PreviewImportTransactionsCommand,
  PreviewImportTransactionsResult,
  PreviewTransactionItem,
  PreviewImportWarning,
} from '../../../../../preload/contracts/ingestion/preview-import.contract';
import { TransactionType } from '../../../../../shared/types/domain';
import { ImportPreviewReviewResolver } from '../../../domain/services/import-preview-review-resolver.service';

export class PreviewImportUseCase {
  constructor(
    private readonly parser: ImportTransactionsParser,
    private readonly taxApportioner: TaxApportioner,
    private readonly assetRepository: AssetRepository,
    private readonly reviewResolver: ImportPreviewReviewResolver = new ImportPreviewReviewResolver(),
  ) {}

  async execute(input: PreviewImportTransactionsCommand): Promise<PreviewImportTransactionsResult> {
    const parsedFile = await this.parser.parse(input.filePath);
    const batches = parsedFile.batches;
    const assetCatalogMap = await this.loadAssetCatalogMap(parsedFile);
    const transactionsPreview: PreviewTransactionItem[] = [];
    const warnings: PreviewImportWarning[] = [];
    const summary = {
      supportedRows: 0,
      pendingRows: 0,
      unsupportedRows: 0,
    };
    let globalRowIndex = 1;

    for (const batch of batches) {
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
