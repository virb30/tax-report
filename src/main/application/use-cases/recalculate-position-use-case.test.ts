import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AssetType } from '../../../shared/types/domain';
import { TransactionType } from '../../../shared/types/domain';
import { SourceType } from '../../../shared/types/domain';
import type { AssetPositionRepository } from '../repositories/asset-position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { RecalculatePositionUseCase } from './recalculate-position-use-case';

describe('RecalculatePositionUseCase', () => {
  let positionRepository: AssetPositionRepository;
  let transactionRepository: TransactionRepository;
  let useCase: RecalculatePositionUseCase;

  beforeEach(() => {
    positionRepository = {
      findByTickerAndYear: jest.fn().mockResolvedValue(null),
      findAllByYear: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    transactionRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      saveMany: jest.fn(),
      findByTicker: jest.fn().mockResolvedValue([]),
      findByPeriod: jest.fn(),
    };
    useCase = new RecalculatePositionUseCase(positionRepository, transactionRepository);
  });

  it('recalculates position from mix of Buy, Sell, Bonus and InitialBalance', async () => {
    (positionRepository.findByTickerAndYear as jest.Mock).mockResolvedValue(null);
    (transactionRepository.findByTicker as jest.Mock).mockResolvedValue([
      {
        id: '1',
        date: '2024-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'PETR4',
        quantity: 100,
        unitPrice: 20,
        fees: 0,
        brokerId: 'broker-xp',
        sourceType: SourceType.Manual,
      },
      {
        id: '2',
        date: '2024-06-15',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: 50,
        unitPrice: 25,
        fees: 5,
        brokerId: 'broker-xp',
        sourceType: SourceType.Manual,
      },
      {
        id: '3',
        date: '2024-09-01',
        type: TransactionType.Sell,
        ticker: 'PETR4',
        quantity: 30,
        unitPrice: 30,
        fees: 0,
        brokerId: 'broker-xp',
        sourceType: SourceType.Manual,
      },
    ]);

    await useCase.execute({ ticker: 'PETR4', year: 2024 });

    expect(positionRepository.save).toHaveBeenCalledTimes(1);
    expect(positionRepository.save).toHaveBeenCalledWith(expect.anything(), 2024);
    const savedSnapshot = (positionRepository.save as jest.Mock).mock.calls[0]?.[0];
    expect(savedSnapshot.ticker).toBe('PETR4');
    expect(savedSnapshot.totalQuantity).toBe(120); // 100 + 50 - 30
    expect(savedSnapshot.brokerBreakdown).toEqual([{ brokerId: 'broker-xp', quantity: 120 }]);
  });

  it('uses existing position assetType when recalculating', async () => {
    (positionRepository.findByTickerAndYear as jest.Mock).mockResolvedValue({
      ticker: 'HGLG11',
      assetType: AssetType.Fii,
      totalQuantity: 10,
      averagePrice: 150,
      brokerBreakdown: [{ brokerId: 'broker-xp', quantity: 10 }],
    });
    (transactionRepository.findByTicker as jest.Mock).mockResolvedValue([
      {
        id: '1',
        date: '2024-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'HGLG11',
        quantity: 10,
        unitPrice: 150,
        fees: 0,
        brokerId: 'broker-xp',
        sourceType: SourceType.Manual,
      },
    ]);

    await useCase.execute({ ticker: 'HGLG11', year: 2024 });

    const savedSnapshot = (positionRepository.save as jest.Mock).mock.calls[0]?.[0];
    expect(savedSnapshot.assetType).toBe(AssetType.Fii);
  });

  it('persists empty position when no transactions exist', async () => {
    (transactionRepository.findByTicker as jest.Mock).mockResolvedValue([]);
    (positionRepository.findByTickerAndYear as jest.Mock).mockResolvedValue({
      ticker: 'VALE3',
      assetType: AssetType.Stock,
      totalQuantity: 50,
      averagePrice: 60,
      brokerBreakdown: [{ brokerId: 'broker-xp', quantity: 50 }],
    });

    await useCase.execute({ ticker: 'VALE3', year: 2024 });

    expect(positionRepository.save).toHaveBeenCalledTimes(1);
    const savedSnapshot = (positionRepository.save as jest.Mock).mock.calls[0]?.[0];
    expect(savedSnapshot.totalQuantity).toBe(0);
    expect(savedSnapshot.brokerBreakdown).toEqual([]);
  });

  it('applies bonus correctly diluting average price', async () => {
    (transactionRepository.findByTicker as jest.Mock).mockResolvedValue([
      {
        id: '1',
        date: '2024-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'ITSA4',
        quantity: 100,
        unitPrice: 10,
        fees: 0,
        brokerId: 'broker-xp',
        sourceType: SourceType.Manual,
      },
      {
        id: '2',
        date: '2024-06-01',
        type: TransactionType.Bonus,
        ticker: 'ITSA4',
        quantity: 50,
        unitPrice: 0,
        fees: 0,
        brokerId: 'broker-xp',
        sourceType: SourceType.Manual,
      },
    ]);

    await useCase.execute({ ticker: 'ITSA4', year: 2024 });

    const savedSnapshot = (positionRepository.save as jest.Mock).mock.calls[0]?.[0];
    expect(savedSnapshot.totalQuantity).toBe(150);
    expect(savedSnapshot.averagePrice).toBeCloseTo(1000 / 150, 10); // 100*10 = 1000, 150 qty
  });
});
