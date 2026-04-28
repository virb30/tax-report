
import { AssetType } from '../../../../shared/types/domain';
import { TransactionType } from '../../../../shared/types/domain';
import { SourceType } from '../../../../shared/types/domain';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { RecalculatePositionUseCase } from './recalculate-position.use-case';
import { mock, mockReset } from 'jest-mock-extended';
import { Transaction } from '../../../domain/portfolio/entities/transaction.entity';
import { Uuid } from '../../../domain/shared/uuid.vo';
import { AssetPosition } from '../../../domain/portfolio/entities/asset-position.entity';
import { Money } from '../../../domain/portfolio/value-objects/money.vo';

describe('RecalculatePositionUseCase', () => {
  const positionRepository = mock<AssetPositionRepository>();
  const transactionRepository = mock<TransactionRepository>();
  let useCase: RecalculatePositionUseCase;

  beforeEach(() => {
    mockReset(positionRepository);
    mockReset(transactionRepository);
    positionRepository.findByTickerAndYear.mockResolvedValue(null);
    positionRepository.findAllByYear.mockResolvedValue([]);
    positionRepository.save.mockResolvedValue(undefined);
    transactionRepository.save.mockResolvedValue(undefined);
    transactionRepository.saveMany.mockResolvedValue(undefined);
    transactionRepository.findByTicker.mockResolvedValue([]);
    transactionRepository.findByPeriod.mockResolvedValue([]);
    useCase = new RecalculatePositionUseCase(positionRepository, transactionRepository);
  });

  it('creates a new position when position not found but transactions exist', async () => {
    const brokerId = Uuid.create();
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2024-06-15',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: 50,
        unitPrice: 25,
        fees: 5,
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ ticker: 'PETR4', year: 2024 });
    expect(positionRepository.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      totalQuantity: 50,
      averagePrice: 25.1,
    });
  });

  it('does not compound an already persisted calculated position', async () => {
    const brokerId = Uuid.create();
    positionRepository.findByTickerAndYear.mockResolvedValue(AssetPosition.create({
      ticker: 'PETR4',
      year: 2024,
      assetType: AssetType.Stock,
      totalQuantity: 50,
      averagePrice: 25.1,
      brokerBreakdown: [{ brokerId, quantity: 50 }],
    }));
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2024-06-15',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: 50,
        unitPrice: 25,
        fees: 5,
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ ticker: 'PETR4', year: 2024 });

    expect(positionRepository.save).toHaveBeenCalledTimes(1);
    expect(positionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      totalQuantity: 50,
      averagePrice: 25.1,
    }));
    expect(result).toEqual({
      totalQuantity: 50,
      averagePrice: 25.1,
    });
  });

  it('recalculates position from mix of Buy, Sell, Bonus and InitialBalance', async () => {
    positionRepository.findByTickerAndYear.mockResolvedValue(AssetPosition.create({
      ticker: 'PETR4',
      year: 2024,
      assetType: AssetType.Stock,
      totalQuantity: 0,
      averagePrice: 0,
      brokerBreakdown: [],
    }));
    const brokerId = Uuid.create();
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2024-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'PETR4',
        quantity: 100,
        unitPrice: 20,
        fees: 0,
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2024-06-15',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: 50,
        unitPrice: 25,
        fees: 5,
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2024-09-01',
        type: TransactionType.Sell,
        ticker: 'PETR4',
        quantity: 30,
        unitPrice: 30,
        fees: 0,
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ ticker: 'PETR4', year: 2024 });
    expect(positionRepository.save).toHaveBeenCalledTimes(1);
    expect(positionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      totalQuantity: 120,
      averagePrice: 21.7,
    }));
    expect(result).toEqual({
      totalQuantity: 120,
      averagePrice: 21.7,
    });
  });

  it('uses existing position assetType when recalculating', async () => {
    const brokerId = Uuid.create();
    positionRepository.findByTickerAndYear.mockResolvedValue(AssetPosition.create({
      ticker: 'HGLG11',
      year: 2024,
      assetType: AssetType.Fii,
      totalQuantity: 10,
      averagePrice: 150,
      brokerBreakdown: [{ brokerId, quantity: 10 }],
    }));
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2024-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'HGLG11',
        quantity: 10,
        unitPrice: 150,
        fees: 0,
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ ticker: 'HGLG11', year: 2024 });
    expect(positionRepository.save).toHaveBeenCalledTimes(1);
    expect(positionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      totalQuantity: 10,
      averagePrice: 150,
      assetType: AssetType.Fii,
    }));
    expect(result).toEqual({
      totalQuantity: 10,
      averagePrice: 150,
    });
  });

  it('persists empty position when no transactions exist', async () => {
    transactionRepository.findByTicker.mockResolvedValue([]);
    positionRepository.findByTickerAndYear.mockResolvedValue(AssetPosition.create({
      ticker: 'VALE3',
      year: 2024,
      assetType: AssetType.Stock,
      totalQuantity: 0,
      averagePrice: 0,
      brokerBreakdown: [],
    }));

    await useCase.execute({ ticker: 'VALE3', year: 2024 });
  });

  it('applies bonus correctly diluting average price', async () => {
    const brokerId = Uuid.create();
    positionRepository.findByTickerAndYear.mockResolvedValue(AssetPosition.create({
      ticker: 'ITSA4',
      year: 2024,
      assetType: AssetType.Stock,
      totalQuantity: 100,
      averagePrice: 10,
      brokerBreakdown: [{ brokerId, quantity: 100 }],
    }));
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2024-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'ITSA4',
        quantity: 100,
        unitPrice: 10,
        fees: 0,
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2024-06-01',
        type: TransactionType.Bonus,
        ticker: 'ITSA4',
        quantity: 50,
        unitPrice: 0,
        fees: 0,
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ ticker: 'ITSA4', year: 2024 });
    const expectedAveragePrice = Money.from(1000).divideBy(150).toNumber();
    expect(positionRepository.save).toHaveBeenCalledTimes(1);
    expect(positionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      totalQuantity: 150,
      averagePrice: expectedAveragePrice,
    }));
    expect(result).toEqual({
      totalQuantity: 150,
      averagePrice: expectedAveragePrice,
    });
  });
});
