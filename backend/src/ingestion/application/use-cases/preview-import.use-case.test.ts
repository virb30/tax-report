import {
  AssetType,
  AssetTypeSource,
  TransactionType,
  UnsupportedImportReason,
} from '../../../shared/types/domain';
import { PreviewImportUseCase } from './preview-import.use-case';
import type { ImportTransactionsParser } from '../interfaces/transactions.parser.interface';
import type { AssetRepository } from '../../../portfolio/application/repositories/asset.repository';
import type { DailyBrokerTaxRepository } from '../repositories/daily-broker-tax.repository';
import { mock } from 'jest-mock-extended';
import { TransactionFeeAllocator } from '../../../portfolio/domain/services/transaction-fee-allocator.service';
import { Asset } from '../../../portfolio/domain/entities/asset.entity';
import { DailyBrokerTax } from '../../domain/entities/daily-broker-tax.entity';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';

describe('PreviewImportUseCase', () => {
  const brokerId = '019cece0-4a22-75b8-95c4-45eb6f4cb2f4';
  const mockParser = mock<ImportTransactionsParser>();
  const assetRepository = mock<AssetRepository>();
  const dailyBrokerTaxRepository = mock<DailyBrokerTaxRepository>();

  beforeEach(() => {
    mockParser.parse.mockReset();
    assetRepository.findByTickersList.mockReset();
    dailyBrokerTaxRepository.findByDateAndBroker.mockReset();
    assetRepository.findByTickersList.mockResolvedValue([]);
    dailyBrokerTaxRepository.findByDateAndBroker.mockResolvedValue(null);
  });

  function createDailyTax(input: { date: string; brokerId: string; fees: number }) {
    return DailyBrokerTax.create({
      date: input.date,
      brokerId: Uuid.from(input.brokerId),
      fees: Money.from(input.fees),
      irrf: Money.from(0),
    });
  }

  it('parses and apportions fees without persisting', async () => {
    mockParser.parse.mockResolvedValue({
      batches: [
        {
          tradeDate: '2025-04-01',
          brokerId,
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
    dailyBrokerTaxRepository.findByDateAndBroker.mockResolvedValue(
      createDailyTax({
        date: '2025-04-01',
        brokerId,
        fees: 1,
      }),
    );
    const transactionFeeAllocator = new TransactionFeeAllocator();

    const useCase = new PreviewImportUseCase(
      mockParser,
      transactionFeeAllocator,
      dailyBrokerTaxRepository,
      assetRepository,
    );

    const result = await useCase.execute({ filePath: '/tmp/ops.csv' });

    expect(mockParser.parse).toHaveBeenCalledWith('/tmp/ops.csv');
    expect(result.transactionsPreview).toHaveLength(2);
    expect(result.transactionsPreview[0]).toEqual({
      date: '2025-04-01',
      ticker: 'PETR4',
      type: TransactionType.Buy,
      quantity: 10,
      unitPrice: 20,
      fees: 0.333333,
      brokerId,
      sourceAssetType: AssetType.Stock,
      resolvedAssetType: AssetType.Stock,
      resolutionStatus: 'resolved_from_file',
      needsReview: false,
      unsupportedReason: null,
    });
    expect(result.transactionsPreview[1]?.fees).toBe(0.666667);
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
          brokerId,
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
    const transactionFeeAllocator = new TransactionFeeAllocator();
    const useCase = new PreviewImportUseCase(
      mockParser,
      transactionFeeAllocator,
      dailyBrokerTaxRepository,
      assetRepository,
    );

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
          brokerId,
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
    const transactionFeeAllocator = new TransactionFeeAllocator();
    const useCase = new PreviewImportUseCase(
      mockParser,
      transactionFeeAllocator,
      dailyBrokerTaxRepository,
      assetRepository,
    );

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
    const transactionFeeAllocator = new TransactionFeeAllocator();
    const useCase = new PreviewImportUseCase(
      mockParser,
      transactionFeeAllocator,
      dailyBrokerTaxRepository,
      assetRepository,
    );

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
