import { describe, expect, it, jest } from '@jest/globals';
import { TransactionType } from '../../../shared/types/domain';
import { ImportTransactionsUseCase } from './import-transactions-use-case';
import type { ImportTransactionsParserPort } from '../interfaces/transactions.parser.interface';
import type { TransactionRepository } from '../repositories/transaction.repository';
import type { RecalculatePositionUseCase } from './recalculate-position-use-case';

describe('ImportTransactionsUseCase', () => {
  it('parses, apportions fees, persists and recalculates positions', async () => {
    const brokerId = '019cece0-4a22-75b8-95c4-45eb6f4cb2f4';
    const mockParser: ImportTransactionsParserPort = {
      parse: jest.fn().mockResolvedValue([
        {
          tradeDate: '2025-04-01',
          brokerId,
          totalOperationalCosts: 1,
          operations: [
            { ticker: 'PETR4', type: TransactionType.Buy, quantity: 10, unitPrice: 20 },
            { ticker: 'VALE3', type: TransactionType.Buy, quantity: 5, unitPrice: 40 },
          ],
        },
      ]),
    };
    const saveManySpy = jest.fn().mockResolvedValue(undefined);
    const findExistingRefsSpy = jest.fn().mockResolvedValue(new Set<string>());
    const mockTransactionRepo: TransactionRepository = {
      save: jest.fn(),
      saveMany: saveManySpy,
      findByTicker: jest.fn(),
      findByPeriod: jest.fn(),
      findExistingExternalRefs: findExistingRefsSpy,
    };
    const recalculateSpy = jest.fn().mockResolvedValue(undefined);
    const mockRecalculate: RecalculatePositionUseCase = {
      execute: recalculateSpy,
    };

    const useCase = new ImportTransactionsUseCase(
      mockParser,
      { allocate: () => [0.33, 0.67] } as never,
      mockTransactionRepo,
      mockRecalculate,
    );

    const result = await useCase.execute({ filePath: '/tmp/ops.csv' });

    expect(mockParser.parse).toHaveBeenCalledWith('/tmp/ops.csv');
    expect(saveManySpy).toHaveBeenCalledTimes(1);
    const savedTransactions = saveManySpy.mock.calls[0]?.[0] as Array<{
      ticker: string;
      type: string;
      fees: number;
      externalRef?: string;
    }>;
    expect(savedTransactions).toHaveLength(2);
    expect(savedTransactions[0]?.ticker).toBe('PETR4');
    expect(savedTransactions[0]?.fees).toBe(0.33);
    expect(savedTransactions[1]?.ticker).toBe('VALE3');
    expect(savedTransactions[1]?.fees).toBe(0.67);
    expect(recalculateSpy).toHaveBeenCalledWith({ ticker: 'PETR4', year: 2025 });
    expect(recalculateSpy).toHaveBeenCalledWith({ ticker: 'VALE3', year: 2025 });
    expect(result.importedCount).toBe(2);
    expect(result.recalculatedTickers).toContain('PETR4');
    expect(result.recalculatedTickers).toContain('VALE3');
  });

  it('skips duplicates via externalRef (idempotence)', async () => {
    const brokerId = '019cece0-4a22-75b8-95c4-45eb6f4cb2f4';
    const mockParser: ImportTransactionsParserPort = {
      parse: jest.fn().mockResolvedValue([
        {
          tradeDate: '2025-04-01',
          brokerId,
          totalOperationalCosts: 0,
          operations: [{ ticker: 'PETR4', type: TransactionType.Buy, quantity: 1, unitPrice: 10 }],
        },
      ]),
    };
    const saveManySpy = jest.fn().mockResolvedValue(undefined);
    let existingRefs = new Set<string>();
    const findExistingRefsSpy = jest.fn().mockImplementation(async (refs: string[]) => {
      const result = new Set(refs.filter((r) => existingRefs.has(r)));
      return result;
    });
    const mockTransactionRepo: TransactionRepository = {
      save: jest.fn(),
      saveMany: saveManySpy,
      findByTicker: jest.fn(),
      findByPeriod: jest.fn(),
      findExistingExternalRefs: findExistingRefsSpy,
    };
    const recalculateSpy = jest.fn().mockResolvedValue(undefined);
    const mockRecalculate: RecalculatePositionUseCase = { execute: recalculateSpy };

    const useCase = new ImportTransactionsUseCase(
      mockParser,
      { allocate: () => [0] } as never,
      mockTransactionRepo,
      mockRecalculate,
    );

    const firstResult = await useCase.execute({ filePath: '/tmp/ops.csv' });
    expect(firstResult.importedCount).toBe(1);
    const savedRefs = (saveManySpy.mock.calls[0]?.[0] as Array<{ externalRef?: string }>)
      .map((t) => t.externalRef)
      .filter(Boolean) as string[];
    existingRefs = new Set(savedRefs);

    const secondResult = await useCase.execute({ filePath: '/tmp/ops.csv' });

    expect(secondResult.importedCount).toBe(0);
    expect(saveManySpy).toHaveBeenCalledTimes(1);
  });
});
