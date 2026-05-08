import { mock, mockReset } from 'jest-mock-extended';
import { AssetType, TransactionType } from '../../../shared/types/domain';
import { SourceType } from '../../../shared/types/domain';
import type { AssetPositionRepository } from '../repositories/asset-position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { MigrateYearUseCase } from './migrate-year.use-case';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { Transaction } from '../../domain/entities/transaction.entity';
import { AssetPosition } from '../../domain/entities/asset-position.entity';
import { Money } from '../../domain/value-objects/money.vo';
import { Quantity } from '../../domain/value-objects/quantity.vo';

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
        totalQuantity: Quantity.from(100),
        averagePrice: Money.from(20),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(100) }],
      }),
    ]);
    transactionRepository.findByPeriod.mockImplementation(
      async (input: { startDate: string; endDate: string }) =>
        new Promise((resolve) => {
          if (input.endDate === '2024-12-31') {
            return resolve([
              Transaction.create({
                date: '2024-01-15',
                type: TransactionType.InitialBalance,
                ticker: 'PETR4',
                quantity: Quantity.from(100),
                unitPrice: Money.from(20),
                fees: Money.from(0),
                brokerId,
                sourceType: SourceType.Manual,
              }),
            ]);
          }
          if (input.startDate === '2025-01-01' && input.endDate === '2025-12-31') {
            return resolve([]);
          }
          return resolve([]);
        }),
    );

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
        totalQuantity: Quantity.from(100),
        averagePrice: Money.from(20),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(100) }],
      }),
    ]);
    transactionRepository.findByPeriod.mockResolvedValue([
      Transaction.create({
        date: '2025-02-10',
        type: TransactionType.Sell,
        ticker: 'PETR4',
        quantity: Quantity.from(40),
        unitPrice: Money.from(25),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ sourceYear: 2024, targetYear: 2025 });

    expect(result).toEqual({
      migratedPositionsCount: 1,
      createdTransactionsCount: 1,
    });
    const savedPositions = positionRepository.saveMany.mock.calls[0]?.[0] ?? [];
    expect(savedPositions).toHaveLength(1);
    expect(savedPositions[0]?.ticker).toBe('PETR4');
    expect(savedPositions[0]?.year).toBe(2025);
    expect(savedPositions[0]?.totalQuantity.getAmount()).toBe('60');
    expect(savedPositions[0]?.averagePrice.getAmount()).toBe('20');
  });

  it('migrates only tickers missing initial balance in the target year', async () => {
    const brokerId = Uuid.create();
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2024,
        totalQuantity: Quantity.from(100),
        averagePrice: Money.from(20),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(100) }],
      }),
      AssetPosition.create({
        ticker: 'VALE3',
        assetType: AssetType.Stock,
        year: 2024,
        totalQuantity: Quantity.from(50),
        averagePrice: Money.from(60),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(50) }],
      }),
    ]);
    transactionRepository.findByPeriod.mockResolvedValue([
      Transaction.create({
        date: '2025-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'VALE3',
        quantity: Quantity.from(50),
        unitPrice: Money.from(60),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ sourceYear: 2024, targetYear: 2025 });

    expect(result).toEqual({
      migratedPositionsCount: 2,
      createdTransactionsCount: 1,
    });
    const savedTransactions = transactionRepository.saveMany.mock.calls[0]?.[0] ?? [];
    expect(savedTransactions).toHaveLength(1);
    expect(savedTransactions[0]?.ticker).toBe('PETR4');
    expect(savedTransactions[0]?.type).toBe(TransactionType.InitialBalance);
  });

  it('returns message when no positions to migrate', async () => {
    transactionRepository.findByPeriod.mockResolvedValue([]);

    const result = await useCase.execute({ sourceYear: 2024, targetYear: 2025 });

    expect(result.migratedPositionsCount).toBe(0);
    expect(result.createdTransactionsCount).toBe(0);
    expect(result.message).toContain('Nenhuma posição');
    expect(transactionRepository.saveMany).not.toHaveBeenCalled();
  });

  it('returns message when source year positions are fully sold and have no open quantity', async () => {
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(0),
        averagePrice: Money.from(0),
        brokerBreakdown: [],
      }),
    ]);
    transactionRepository.findByPeriod.mockResolvedValue([]);

    const result = await useCase.execute({ sourceYear: 2025, targetYear: 2026 });

    expect(result.migratedPositionsCount).toBe(0);
    expect(result.createdTransactionsCount).toBe(0);
    expect(result.message).toContain('Nenhuma posição');
    expect(transactionRepository.saveMany).not.toHaveBeenCalled();
    expect(positionRepository.saveMany).not.toHaveBeenCalled();
  });

  it('ignores unrelated inconsistent target-year transactions while migrating covered tickers', async () => {
    const brokerId = Uuid.create();
    const unrelatedBrokerId = Uuid.create();

    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(100),
        averagePrice: Money.from(20),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(100) }],
      }),
    ]);
    transactionRepository.findByPeriod.mockResolvedValue([
      Transaction.create({
        date: '2026-02-10',
        type: TransactionType.Sell,
        ticker: 'VALE3',
        quantity: Quantity.from(10),
        unitPrice: Money.from(30),
        fees: Money.from(0),
        brokerId: unrelatedBrokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ sourceYear: 2025, targetYear: 2026 });

    expect(result).toEqual({
      migratedPositionsCount: 1,
      createdTransactionsCount: 1,
    });
    expect(transactionRepository.saveMany).toHaveBeenCalledTimes(1);
    const savedPositions = positionRepository.saveMany.mock.calls[0]?.[0] ?? [];
    expect(savedPositions).toHaveLength(1);
    expect(savedPositions[0]?.ticker).toBe('PETR4');
  });

  it('throws business error with context when a covered ticker has inconsistent target-year operations', async () => {
    const brokerId = Uuid.create();

    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(100),
        averagePrice: Money.from(20),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(100) }],
      }),
    ]);
    transactionRepository.findByPeriod.mockResolvedValue([
      Transaction.create({
        date: '2026-02-10',
        type: TransactionType.InitialBalance,
        ticker: 'PETR4',
        quantity: Quantity.from(20),
        unitPrice: Money.from(20),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2026-03-10',
        type: TransactionType.Sell,
        ticker: 'PETR4',
        quantity: Quantity.from(50),
        unitPrice: Money.from(30),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    await expect(useCase.execute({ sourceYear: 2025, targetYear: 2026 })).rejects.toThrow(
      'Falha ao migrar posições de 2025 para 2026',
    );
    await expect(useCase.execute({ sourceYear: 2025, targetYear: 2026 })).rejects.toMatchObject({
      code: 'MIGRATION_FAILED',
      kind: 'business',
    });
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
