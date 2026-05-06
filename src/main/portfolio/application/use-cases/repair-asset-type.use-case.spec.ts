import { mock, mockReset } from 'jest-mock-extended';
import {
  AssetType,
  AssetTypeSource,
  SourceType,
  TransactionType,
} from '../../../../shared/types/domain';
import { Asset } from '../../domain/entities/asset.entity';
import { Transaction } from '../../domain/entities/transaction.entity';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import type { AssetRepository } from '../repositories/asset.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import type { ReprocessTickerYearsService } from '../services/reprocess-ticker-years.service';
import { RepairAssetTypeUseCase } from './repair-asset-type.use-case';

describe('RepairAssetTypeUseCase', () => {
  const assetRepository = mock<AssetRepository>();
  const transactionRepository = mock<TransactionRepository>();
  const reprocessTickerYearsService = mock<ReprocessTickerYearsService>();
  let useCase: RepairAssetTypeUseCase;

  beforeEach(() => {
    mockReset(assetRepository);
    mockReset(transactionRepository);
    mockReset(reprocessTickerYearsService);
    assetRepository.save.mockResolvedValue(undefined);
    reprocessTickerYearsService.execute.mockResolvedValue({ reprocessedCount: 3 });
    useCase = new RepairAssetTypeUseCase(
      assetRepository,
      transactionRepository,
      reprocessTickerYearsService,
    );
  });

  it('updates the canonical asset type and reprocesses affected years in ascending order', async () => {
    assetRepository.findByTicker.mockResolvedValue(
      Asset.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.File,
      }),
    );
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2025-01-10',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: 1,
        unitPrice: 10,
        fees: 0,
        brokerId: Uuid.create(),
        sourceType: SourceType.Csv,
      }),
      Transaction.create({
        date: '2023-01-10',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: 1,
        unitPrice: 10,
        fees: 0,
        brokerId: Uuid.create(),
        sourceType: SourceType.Csv,
      }),
      Transaction.create({
        date: '2024-01-10',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: 1,
        unitPrice: 10,
        fees: 0,
        brokerId: Uuid.create(),
        sourceType: SourceType.Csv,
      }),
    ]);

    const result = await useCase.execute({
      ticker: 'PETR4',
      assetType: AssetType.Bdr,
    });

    expect(assetRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: 'PETR4',
        assetType: AssetType.Bdr,
        resolutionSource: AssetTypeSource.Manual,
      }),
    );
    expect(reprocessTickerYearsService.execute).toHaveBeenCalledWith({
      ticker: 'PETR4',
      assetType: AssetType.Bdr,
      affectedYears: [2023, 2024, 2025],
    });
    expect(result).toEqual({
      ticker: 'PETR4',
      assetType: AssetType.Bdr,
      affectedYears: [2023, 2024, 2025],
      reprocessedCount: 3,
    });
  });
});
