import { describe, expect, it, jest } from '@jest/globals';
import { TransactionType } from '../../../../shared/types/domain';
import { ImportTransactionsUseCase } from './import-transactions-use-case';
import type { ImportTransactionsParser } from '../../interfaces/transactions.parser.interface';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import type { Queue } from '../../events/queue.interface';
import { TransactionsImportedEvent } from '../../../domain/events/transactions-imported.event';
import type { TaxApportioner } from '../../../domain/ingestion/tax-apportioner.service';
import { mock, mockReset } from 'jest-mock-extended';

describe('ImportTransactionsUseCase', () => {
  const mockParser = mock<ImportTransactionsParser>();
  const mockTransactionRepo = mock<TransactionRepository>();
  const mockQueue = mock<Queue>();
  const mockTaxApportioner = mock<TaxApportioner>();

  beforeEach(() => {
    mockReset(mockParser);
    mockReset(mockTransactionRepo);
    mockReset(mockQueue);
    mockReset(mockTaxApportioner);
  });

  it('parses, apportions fees, persists and recalculates positions', async () => {
    const brokerId = '019cece0-4a22-75b8-95c4-45eb6f4cb2f4';
    mockParser.parse.mockResolvedValue([
      {
        tradeDate: '2025-04-01',
        brokerId,
        totalOperationalCosts: 1,
        operations: [
          { ticker: 'PETR4', type: TransactionType.Buy, quantity: 10, unitPrice: 20 },
          { ticker: 'VALE3', type: TransactionType.Buy, quantity: 5, unitPrice: 40 },
        ],
      },
    ]);
    mockTaxApportioner.allocate.mockReturnValue([0.33, 0.67]);
    mockTransactionRepo.saveMany.mockResolvedValue(undefined);
    mockTransactionRepo.findExistingExternalRefs.mockResolvedValue(new Set<string>());
    mockQueue.publish.mockResolvedValue(undefined);

    const useCase = new ImportTransactionsUseCase(
      mockParser,
      mockTaxApportioner,
      mockTransactionRepo,
      mockQueue,
    );

    const result = await useCase.execute({ filePath: '/tmp/ops.csv' });

    expect(mockParser.parse).toHaveBeenCalledWith('/tmp/ops.csv');
    expect(mockTransactionRepo.saveMany).toHaveBeenCalledTimes(1);
    const savedTransactions = mockTransactionRepo.saveMany.mock.calls[0]?.[0] as Array<{
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
    expect(mockQueue.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TransactionsImportedEvent.name,
        ticker: 'PETR4',
        year: 2025,
      }),
    );
    expect(mockQueue.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TransactionsImportedEvent.name,
        ticker: 'VALE3',
        year: 2025,
      }),
    );
    expect(result.importedCount).toBe(2);
    expect(result.recalculatedTickers).toContain('PETR4');
    expect(result.recalculatedTickers).toContain('VALE3');
  });

  it('skips duplicates via externalRef (idempotence)', async () => {
    const brokerId = '019cece0-4a22-75b8-95c4-45eb6f4cb2f4';
    mockParser.parse.mockResolvedValue([
      {
        tradeDate: '2025-04-01',
        brokerId,
        totalOperationalCosts: 0,
        operations: [{ ticker: 'PETR4', type: TransactionType.Buy, quantity: 1, unitPrice: 10 }],
      },
    ]);
    mockTaxApportioner.allocate.mockReturnValue([0]);
    mockTransactionRepo.saveMany.mockResolvedValue(undefined);
    mockQueue.publish.mockResolvedValue(undefined);

    let existingRefs = new Set<string>();
    mockTransactionRepo.findExistingExternalRefs.mockImplementation(async (refs: string[]) => {
      const result = new Set(refs.filter((r) => existingRefs.has(r)));
      return result;
    });

    const useCase = new ImportTransactionsUseCase(
      mockParser,
      mockTaxApportioner,
      mockTransactionRepo,
      mockQueue,
    );

    const firstResult = await useCase.execute({ filePath: '/tmp/ops.csv' });
    expect(firstResult.importedCount).toBe(1);
    const savedRefs = (mockTransactionRepo.saveMany.mock.calls[0]?.[0] as Array<{ externalRef?: string }>)
      .map((t) => t.externalRef)
      .filter(Boolean) as string[];
    existingRefs = new Set(savedRefs);

    const secondResult = await useCase.execute({ filePath: '/tmp/ops.csv' });

    expect(secondResult.importedCount).toBe(0);
    expect(mockTransactionRepo.saveMany).toHaveBeenCalledTimes(1);
  });
});
