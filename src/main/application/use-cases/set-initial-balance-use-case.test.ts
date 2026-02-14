import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AssetType } from '../../../shared/types/domain';
import type { PositionRepository } from '../repositories/position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { SetInitialBalanceUseCase } from './set-initial-balance-use-case';

describe('SetInitialBalanceUseCase', () => {
  let positionRepository: PositionRepository;
  let transactionRepository: TransactionRepository;
  let useCase: SetInitialBalanceUseCase;

  beforeEach(() => {
    positionRepository = {
      findByTickerAndYear: jest.fn().mockResolvedValue(null),
      findAllByYear: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    transactionRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      saveMany: jest.fn(),
      findByTicker: jest.fn(),
      findByPeriod: jest.fn(),
    };
    useCase = new SetInitialBalanceUseCase(positionRepository, transactionRepository);
  });

  it('creates transaction and position for new ticker', async () => {
    const result = await useCase.execute({
      ticker: 'PETR4',
      brokerId: 'broker-xp',
      assetType: AssetType.Stock,
      quantity: 10,
      averagePrice: 20,
      year: 2025,
    });

    expect(result).toEqual({
      ticker: 'PETR4',
      brokerId: 'broker-xp',
      quantity: 10,
      averagePrice: 20,
    });
    expect(positionRepository.save).toHaveBeenCalledTimes(1);
    expect(positionRepository.save).toHaveBeenCalledWith(expect.anything(), 2025);
    expect(transactionRepository.save).toHaveBeenCalledTimes(1);
    const transactionCall = (transactionRepository.save as jest.Mock).mock.calls[0]?.[0];
    expect(transactionCall.date).toBe('2025-01-01');
  });

  it('sums to existing position when ticker exists', async () => {
    (positionRepository.findByTickerAndYear as jest.Mock).mockResolvedValue({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      totalQuantity: 10,
      averagePrice: 20,
      brokerBreakdown: [{ brokerId: 'broker-xp', quantity: 10 }],
    });

    await useCase.execute({
      ticker: 'PETR4',
      brokerId: 'broker-xp',
      assetType: AssetType.Stock,
      quantity: 10,
      averagePrice: 30,
      year: 2025,
    });

    const saveCall = (positionRepository.save as jest.Mock).mock.calls[0]?.[0];
    expect(positionRepository.save).toHaveBeenCalledWith(expect.anything(), 2025);
    expect(saveCall.totalQuantity).toBe(20);
    expect(saveCall.averagePrice).toBe(25);
  });

  it('throws when ticker is empty', async () => {
    await expect(
      useCase.execute({
        ticker: '',
        brokerId: 'broker-xp',
        assetType: AssetType.Stock,
        quantity: 10,
        averagePrice: 20,
        year: 2025,
      }),
    ).rejects.toThrow('Ticker é obrigatório.');
  });
});
