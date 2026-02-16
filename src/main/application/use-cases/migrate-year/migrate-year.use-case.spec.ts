import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TransactionType } from '../../../../shared/types/domain';
import { SourceType } from '../../../../shared/types/domain';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { MigrateYearUseCase } from './migrate-year.use-case';

describe('MigrateYearUseCase', () => {
  let positionRepository: AssetPositionRepository;
  let transactionRepository: TransactionRepository;
  let recalculateFn: jest.Mock;
  let useCase: MigrateYearUseCase;

  beforeEach(() => {
    positionRepository = {
      findByTickerAndYear: jest.fn().mockResolvedValue(null),
      findAllByYear: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    transactionRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      saveMany: jest.fn().mockResolvedValue(undefined),
      findByTicker: jest.fn(),
      findByPeriod: jest.fn().mockResolvedValue([]),
    };
    recalculateFn = jest.fn().mockResolvedValue(undefined);
    useCase = new MigrateYearUseCase(
      positionRepository,
      transactionRepository,
      (input) => recalculateFn(input),
    );
  });

  it('creates InitialBalance transactions and recalculates positions', async () => {
    (positionRepository.findByTickerAndYear as jest.Mock).mockResolvedValue({
      ticker: 'PETR4',
      assetType: 'stock',
      totalQuantity: 0,
      averagePrice: 0,
      brokerBreakdown: [],
    });
    (transactionRepository.findByPeriod as jest.Mock)
      .mockImplementation(async (input: { startDate: string; endDate: string }) => {
        if (input.endDate === '2024-12-31') {
          return [
            {
              id: '1',
              date: '2024-01-15',
              type: TransactionType.InitialBalance,
              ticker: 'PETR4',
              quantity: 100,
              unitPrice: 20,
              fees: 0,
              brokerId: 'broker-xp',
              sourceType: SourceType.Manual,
            },
          ];
        }
        if (input.startDate === '2025-01-01' && input.endDate === '2025-12-31') {
          return [];
        }
        return [];
      });

    const result = await useCase.execute({ sourceYear: 2024, targetYear: 2025 });

    expect(result.migratedPositionsCount).toBe(1);
    expect(result.createdTransactionsCount).toBe(1);
    expect(transactionRepository.saveMany).toHaveBeenCalledTimes(1);
    const savedTransactions = (transactionRepository.saveMany as jest.Mock).mock.calls[0]?.[0];
    expect(savedTransactions).toHaveLength(1);
    expect(savedTransactions[0]?.type).toBe(TransactionType.InitialBalance);
    expect(savedTransactions[0]?.date).toBe('2025-01-01');
    expect(savedTransactions[0]?.ticker).toBe('PETR4');
    expect(savedTransactions[0]?.quantity).toBe(100);
    expect(savedTransactions[0]?.unitPrice).toBe(20);
    expect(recalculateFn).toHaveBeenCalledWith({ ticker: 'PETR4', year: 2025 });
  });

  it('blocks migration when InitialBalance already exists for target year', async () => {
    (transactionRepository.findByPeriod as jest.Mock).mockImplementation(
      async (input: { startDate: string; endDate: string }) => {
        if (input.startDate === '2025-01-01' && input.endDate === '2025-12-31') {
          return [
            {
              id: 'existing',
              date: '2025-01-01',
              type: TransactionType.InitialBalance,
              ticker: 'PETR4',
              quantity: 50,
              unitPrice: 22,
              fees: 0,
              brokerId: 'broker-xp',
              sourceType: SourceType.Manual,
            },
          ];
        }
        return [];
      },
    );

    await expect(useCase.execute({ sourceYear: 2024, targetYear: 2025 })).rejects.toThrow(
      'Migração duplicada',
    );
    expect(transactionRepository.saveMany).not.toHaveBeenCalled();
  });

  it('returns message when no positions to migrate', async () => {
    (transactionRepository.findByPeriod as jest.Mock).mockResolvedValue([]);

    const result = await useCase.execute({ sourceYear: 2024, targetYear: 2025 });

    expect(result.migratedPositionsCount).toBe(0);
    expect(result.createdTransactionsCount).toBe(0);
    expect(result.message).toContain('Nenhuma posição');
    expect(transactionRepository.saveMany).not.toHaveBeenCalled();
  });

  it('throws when target year is not source year + 1', async () => {
    await expect(useCase.execute({ sourceYear: 2024, targetYear: 2026 })).rejects.toThrow(
      'ano de destino deve ser exatamente',
    );
  });

  it('throws when source year is invalid', async () => {
    await expect(useCase.execute({ sourceYear: 1999, targetYear: 2000 })).rejects.toThrow(
      'Ano de origem inválido',
    );
  });
});
