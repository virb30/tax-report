
import { mock, mockReset } from 'jest-mock-extended';
import { AssetType, TransactionType } from '../../../../shared/types/domain';
import { SourceType } from '../../../../shared/types/domain';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { MigrateYearUseCase } from './migrate-year.use-case';
import { Uuid } from '../../../domain/shared/uuid.vo';
import { Transaction } from '../../../domain/portfolio/entities/transaction.entity';
import { AssetPosition } from '../../../domain/portfolio/entities/asset-position.entity';

describe('MigrateYearUseCase', () => {
  const positionRepository = mock<AssetPositionRepository>();
  const transactionRepository = mock<TransactionRepository>();
  let useCase: MigrateYearUseCase;

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
    useCase = new MigrateYearUseCase(positionRepository, transactionRepository);
  });

  it('creates InitialBalance transactions and recalculates positions', async () => {
    const brokerId = Uuid.create();
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2024,
        totalQuantity: 100,
        averagePrice: 20,
        brokerBreakdown: [{ brokerId, quantity: 100 }],
      }),
    ]);
    transactionRepository.findByPeriod.mockImplementation(async (input: { startDate: string; endDate: string }) => {
      return new Promise((resolve) => {
        if (input.endDate === '2024-12-31') {
          return resolve([
            Transaction.create({
              date: '2024-01-15',
              type: TransactionType.InitialBalance,
              ticker: 'PETR4',
              quantity: 100,
              unitPrice: 20,
              fees: 0,
              brokerId,
              sourceType: SourceType.Manual,
            }),
          ]);
        }
        if (input.startDate === '2025-01-01' && input.endDate === '2025-12-31') {
          return resolve([]);
        }
        return resolve([]);
      });
    });

    const result = await useCase.execute({ sourceYear: 2024, targetYear: 2025 });

    expect(result.migratedPositionsCount).toBe(1);
    expect(result.createdTransactionsCount).toBe(1);
    expect(transactionRepository.saveMany).toHaveBeenCalledTimes(1);
    expect(positionRepository.saveMany).toHaveBeenCalledTimes(1);
  });

  it('calculates target year after applying migrated initial balance before existing target operations', async () => {
    const brokerId = Uuid.create();
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2024,
        totalQuantity: 100,
        averagePrice: 20,
        brokerBreakdown: [{ brokerId, quantity: 100 }],
      }),
    ]);
    transactionRepository.findByPeriod.mockResolvedValue([
      Transaction.create({
        date: '2025-02-10',
        type: TransactionType.Sell,
        ticker: 'PETR4',
        quantity: 40,
        unitPrice: 25,
        fees: 0,
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ sourceYear: 2024, targetYear: 2025 });

    expect(result).toEqual({
      migratedPositionsCount: 1,
      createdTransactionsCount: 1,
    });
    expect(positionRepository.saveMany).toHaveBeenCalledWith([
      expect.objectContaining({
        ticker: 'PETR4',
        year: 2025,
        totalQuantity: 60,
        averagePrice: 20,
      }),
    ]);
  });

  it('migrates only tickers missing initial balance in the target year', async () => {
    const brokerId = Uuid.create();
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2024,
        totalQuantity: 100,
        averagePrice: 20,
        brokerBreakdown: [{ brokerId, quantity: 100 }],
      }),
      AssetPosition.create({
        ticker: 'VALE3',
        assetType: AssetType.Stock,
        year: 2024,
        totalQuantity: 50,
        averagePrice: 60,
        brokerBreakdown: [{ brokerId, quantity: 50 }],
      }),
    ]);
    transactionRepository.findByPeriod.mockResolvedValue([
      Transaction.create({
        date: '2025-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'VALE3',
        quantity: 50,
        unitPrice: 60,
        fees: 0,
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ sourceYear: 2024, targetYear: 2025 });

    expect(result).toEqual({
      migratedPositionsCount: 2,
      createdTransactionsCount: 1,
    });
    expect(transactionRepository.saveMany).toHaveBeenCalledWith([
      expect.objectContaining({
        ticker: 'PETR4',
        type: TransactionType.InitialBalance,
      }),
    ]);
  });

  it('returns message when no positions to migrate', async () => {
    transactionRepository.findByPeriod.mockResolvedValue([]);

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
