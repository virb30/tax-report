import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AssetType } from '../../../../shared/types/domain';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { SetInitialBalanceUseCase } from './set-initial-balance-use-case';
import { mock } from 'jest-mock-extended';
import { AssetPosition } from '../../../domain/portfolio/asset-position.entity';
import { Uuid } from '../../../domain/shared/uuid.vo';

describe('SetInitialBalanceUseCase', () => {
  const positionRepository = mock<AssetPositionRepository>();
  const transactionRepository = mock<TransactionRepository>();
  let useCase: SetInitialBalanceUseCase;

  beforeEach(() => {
    positionRepository.findByTickerAndYear.mockResolvedValue(null);
    positionRepository.findAllByYear.mockResolvedValue([]);
    positionRepository.save.mockResolvedValue(undefined);
    transactionRepository.save.mockResolvedValue(undefined);
    transactionRepository.saveMany.mockResolvedValue(undefined);
    transactionRepository.findByTicker.mockResolvedValue([]);
    transactionRepository.findByPeriod.mockResolvedValue([]);
    useCase = new SetInitialBalanceUseCase(positionRepository, transactionRepository);
  });

  it('creates transaction and position for new ticker', async () => {
    const brokerId = Uuid.create();
    const result = await useCase.execute({
      ticker: 'PETR4',
      brokerId: brokerId.value,
      assetType: AssetType.Stock,
      quantity: 10,
      averagePrice: 20,
      year: 2025,
    });

    expect(result).toEqual({
      ticker: 'PETR4',
      brokerId: brokerId.value,
      quantity: 10,
      averagePrice: 20,
    });
    expect(positionRepository.save).toHaveBeenCalledTimes(1);
    expect(positionRepository.save).toHaveBeenCalledWith(expect.anything());
    expect(transactionRepository.save).toHaveBeenCalledTimes(1);
    const transactionCall = transactionRepository.save.mock.calls[0]?.[0];
    expect(transactionCall.date).toBe('2025-01-01');
  });

  it('should sum to existing position when ticker exists', async () => {
    const brokerId = Uuid.create();
    positionRepository.findByTickerAndYear.mockResolvedValue(AssetPosition.create({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      totalQuantity: 10,
      averagePrice: 20,
      brokerBreakdown: [{ brokerId, quantity: 10 }],
      year: 2025,
    }));

    const result = await useCase.execute({
      ticker: 'PETR4',
      brokerId: brokerId.value,
      assetType: AssetType.Stock,
      quantity: 10,
      averagePrice: 30,
      year: 2025,
    });

    expect(result.quantity).toBe(20);
    expect(result.averagePrice).toBeCloseTo(25);
    expect(result.brokerId).toBe(brokerId.value);
    expect(result.ticker).toBe('PETR4');
  });

  it('throws when ticker is empty', async () => {
    const brokerId = Uuid.create();
    await expect(
      useCase.execute({
        ticker: '',
        brokerId: brokerId.value,
        assetType: AssetType.Stock,
        quantity: 10,
        averagePrice: 20,
        year: 2025,
      }),
    ).rejects.toThrow('Ticker é obrigatório.');
  });
});
