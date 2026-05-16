import { mock, mockReset } from 'jest-mock-extended';
import {
  AssetType,
  AssetTypeSource,
  SourceType,
  TransactionType,
} from '../../../shared/types/domain';
import { Asset } from '../../domain/entities/asset.entity';
import { Transaction } from '../../domain/entities/transaction.entity';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import type { AssetRepository } from '../repositories/asset.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import type { ReprocessTickerYearsService } from '../services/reprocess-ticker-years.service';
import type { Queue } from '../../../shared/infra/events/queue.interface';
import { AssetTaxClassificationChangedEvent } from '../../../shared/domain/events/asset-tax-classification-changed.event';
import { RepairAssetTypeUseCase } from './repair-asset-type.use-case';
import { Quantity } from '../../domain/value-objects/quantity.vo';
import { Money } from '../../domain/value-objects/money.vo';

describe('RepairAssetTypeUseCase', () => {
  const assetRepository = mock<AssetRepository>();
  const transactionRepository = mock<TransactionRepository>();
  const reprocessTickerYearsService = mock<ReprocessTickerYearsService>();
  const queue = mock<Queue>();
  let useCase: RepairAssetTypeUseCase;

  beforeEach(() => {
    mockReset(assetRepository);
    mockReset(transactionRepository);
    mockReset(reprocessTickerYearsService);
    mockReset(queue);
    assetRepository.save.mockResolvedValue(undefined);
    reprocessTickerYearsService.execute.mockResolvedValue({ reprocessedCount: 3 });
    queue.publish.mockResolvedValue(undefined);
    useCase = new RepairAssetTypeUseCase(
      assetRepository,
      transactionRepository,
      reprocessTickerYearsService,
      queue,
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
        quantity: Quantity.from(1),
        unitPrice: Money.from(10),
        fees: Money.from(0),
        brokerId: Uuid.create(),
        sourceType: SourceType.Csv,
      }),
      Transaction.create({
        date: '2023-01-10',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: Quantity.from(1),
        unitPrice: Money.from(10),
        fees: Money.from(0),
        brokerId: Uuid.create(),
        sourceType: SourceType.Csv,
      }),
      Transaction.create({
        date: '2024-01-10',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: Quantity.from(1),
        unitPrice: Money.from(10),
        fees: Money.from(0),
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

  it('publishes asset classification changes with the earliest affected year and preserves output', async () => {
    assetRepository.findByTicker.mockResolvedValue(null);
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2025-07-10',
        type: TransactionType.Buy,
        ticker: 'MXRF11',
        quantity: Quantity.from(1),
        unitPrice: Money.from(10),
        fees: Money.from(0),
        brokerId: Uuid.create(),
        sourceType: SourceType.Csv,
      }),
      Transaction.create({
        date: '2024-03-20',
        type: TransactionType.Sell,
        ticker: 'MXRF11',
        quantity: Quantity.from(1),
        unitPrice: Money.from(11),
        fees: Money.from(0),
        brokerId: Uuid.create(),
        sourceType: SourceType.Csv,
      }),
    ]);

    const result = await useCase.execute({
      ticker: 'MXRF11',
      assetType: AssetType.Fii,
    });

    expect(queue.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        name: AssetTaxClassificationChangedEvent.name,
        ticker: 'MXRF11',
        earliestYear: 2024,
      }),
    );
    expect(result).toEqual({
      ticker: 'MXRF11',
      assetType: AssetType.Fii,
      affectedYears: [2024, 2025],
      reprocessedCount: 3,
    });
  });
});
