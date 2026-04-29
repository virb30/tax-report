
import { AssetType, AssetTypeSource, TransactionType, UnsupportedImportReason } from '../../../../shared/types/domain';
import { PreviewImportUseCase } from './preview-import-use-case';
import type { ImportTransactionsParser } from '../../interfaces/transactions.parser.interface';
import type { AssetRepository } from '../../repositories/asset.repository';
import { mock } from 'jest-mock-extended';
import { TaxApportioner } from '../../../domain/ingestion/tax-apportioner.service';
import { Asset } from '../../../domain/portfolio/entities/asset.entity';

describe('PreviewImportUseCase', () => {
  const mockParser = mock<ImportTransactionsParser>();
  const assetRepository = mock<AssetRepository>();

  beforeEach(() => {
    mockParser.parse.mockReset();
    assetRepository.findByTickersList.mockReset();
    assetRepository.findByTickersList.mockResolvedValue([]);
  });

  it('parses and apportions fees without persisting', async () => {
    mockParser.parse.mockResolvedValue({
      batches: [
        {
          tradeDate: '2025-04-01',
          brokerId: 'broker-xp',
          totalOperationalCosts: 1,
          operations: [
            {
              ticker: 'PETR4',
              type: TransactionType.Buy,
              quantity: 10,
              unitPrice: 20,
              sourceAssetType: AssetType.Stock,
              sourceAssetTypeLabel: 'Acao',
            },
            {
              ticker: 'VALE3',
              type: TransactionType.Sell,
              quantity: 10,
              unitPrice: 40,
              sourceAssetType: null,
              sourceAssetTypeLabel: null,
            },
          ],
        },
      ],
      unsupportedRows: [],
    });
    assetRepository.findByTickersList.mockResolvedValue([
      Asset.create({
        ticker: 'VALE3',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.Manual,
      }),
    ]);
    const taxApportioner = new TaxApportioner();

    const useCase = new PreviewImportUseCase(mockParser, taxApportioner, assetRepository);

    const result = await useCase.execute({ filePath: '/tmp/ops.csv' });

    expect(mockParser.parse).toHaveBeenCalledWith('/tmp/ops.csv');
    expect(result.transactionsPreview).toHaveLength(2);
    expect(result.transactionsPreview[0]).toEqual({
      date: '2025-04-01',
      ticker: 'PETR4',
      type: TransactionType.Buy,
      quantity: 10,
      unitPrice: 20,
      fees: 0.33,
      brokerId: 'broker-xp',
      sourceAssetType: AssetType.Stock,
      resolvedAssetType: AssetType.Stock,
      resolutionStatus: 'resolved_from_file',
      needsReview: false,
      unsupportedReason: null,
    });
    expect(result.transactionsPreview[1]?.fees).toBe(0.67);
    expect(result.transactionsPreview[1]?.type).toBe(TransactionType.Sell);
    expect(result.transactionsPreview[1]?.resolvedAssetType).toBe(AssetType.Stock);
    expect(result.transactionsPreview[1]?.resolutionStatus).toBe('resolved_from_catalog');
    expect(result.summary).toEqual({
      supportedRows: 2,
      pendingRows: 0,
      unsupportedRows: 0,
    });
    expect(result.batches).toHaveLength(1);
    expect(result.warnings).toBeUndefined();
  });

  it('triggers BONUS_MISSING_COST warning when Bonus transaction has zero unit price', async () => {
    mockParser.parse.mockResolvedValue({
      batches: [
        {
          tradeDate: '2025-04-01',
          brokerId: 'broker-xp',
          totalOperationalCosts: 0,
          operations: [
            {
              ticker: 'PETR4',
              type: TransactionType.Bonus,
              quantity: 10,
              unitPrice: 0,
              sourceAssetType: AssetType.Stock,
              sourceAssetTypeLabel: 'Acao',
            },
          ],
        },
      ],
      unsupportedRows: [],
    });
    const taxApportioner = new TaxApportioner();
    const useCase = new PreviewImportUseCase(mockParser, taxApportioner, assetRepository);

    const result = await useCase.execute({ filePath: '/tmp/ops.csv' });

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings?.[0]).toMatchObject({
      row: 1,
      type: 'BONUS_MISSING_COST',
      message: expect.stringContaining('PETR4'),
    });
  });

  it('marks supported rows without file or catalog type as unresolved and needing review', async () => {
    mockParser.parse.mockResolvedValue({
      batches: [
        {
          tradeDate: '2025-04-01',
          brokerId: 'broker-xp',
          totalOperationalCosts: 0,
          operations: [
            {
              ticker: 'PETR4',
              type: TransactionType.Split,
              quantity: 2,
              unitPrice: 0,
              sourceAssetType: null,
              sourceAssetTypeLabel: null,
            },
          ],
        },
      ],
      unsupportedRows: [],
    });
    const taxApportioner = new TaxApportioner();
    const useCase = new PreviewImportUseCase(mockParser, taxApportioner, assetRepository);

    const result = await useCase.execute({ filePath: '/tmp/ops.csv' });

    expect(result.transactionsPreview).toHaveLength(1);
    expect(result.transactionsPreview[0]).toMatchObject({
      type: TransactionType.Split,
      resolvedAssetType: null,
      resolutionStatus: 'unresolved',
      needsReview: true,
      unsupportedReason: null,
    });
    expect(result.summary).toEqual({
      supportedRows: 1,
      pendingRows: 1,
      unsupportedRows: 0,
    });
  });

  it('classifies unsupported event rows separately from reviewable supported rows', async () => {
    mockParser.parse.mockResolvedValue({
      batches: [],
      unsupportedRows: [
        {
          row: 2,
          date: '2025-04-01',
          ticker: 'PETR4',
          quantity: 10,
          unitPrice: 20,
          brokerId: 'broker-xp',
          sourceAssetType: AssetType.Stock,
          sourceAssetTypeLabel: 'Acao',
          unsupportedReason: UnsupportedImportReason.UnsupportedEvent,
        },
      ],
    });
    const taxApportioner = new TaxApportioner();
    const useCase = new PreviewImportUseCase(mockParser, taxApportioner, assetRepository);

    const result = await useCase.execute({ filePath: '/tmp/ops.csv' });

    expect(result.transactionsPreview).toEqual([
      expect.objectContaining({
        ticker: 'PETR4',
        type: null,
        unsupportedReason: UnsupportedImportReason.UnsupportedEvent,
        needsReview: false,
        resolutionStatus: 'unresolved',
      }),
    ]);
    expect(result.summary).toEqual({
      supportedRows: 0,
      pendingRows: 0,
      unsupportedRows: 1,
    });
  });
});
