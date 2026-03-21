import { describe, expect, it, jest } from '@jest/globals';
import { TransactionType } from '../../../../shared/types/domain';
import { PreviewImportUseCase } from './preview-import-use-case';
import type { ImportTransactionsParser } from '../../interfaces/transactions.parser.interface';
import { mock } from 'jest-mock-extended';
import { TaxApportioner } from '../../../domain/ingestion/tax-apportioner.service';

describe('PreviewImportUseCase', () => {
  const mockParser = mock<ImportTransactionsParser>();
  it('parses and apportions fees without persisting', async () => {
    mockParser.parse.mockResolvedValue([
      {
        tradeDate: '2025-04-01',
        brokerId: 'broker-xp',
        totalOperationalCosts: 1,
        operations: [
          { ticker: 'PETR4', type: TransactionType.Buy, quantity: 10, unitPrice: 20 },
          { ticker: 'VALE3', type: TransactionType.Sell, quantity: 10, unitPrice: 40 },
        ],
      },
    ]);
    const taxApportioner = new TaxApportioner();

    const useCase = new PreviewImportUseCase(mockParser, taxApportioner);

    const result = await useCase.execute({ filePath: '/tmp/ops.csv' });

    expect(mockParser.parse).toHaveBeenCalledWith('/tmp/ops.csv');
    expect(result.transactionsPreview).toHaveLength(2);
    expect(result.transactionsPreview[0]).toEqual({
      date: '2025-04-01',
      ticker: 'PETR4',
      type: 'buy',
      quantity: 10,
      unitPrice: 20,
      fees: 0.33,
      brokerId: 'broker-xp',
    });
    expect(result.transactionsPreview[1]?.fees).toBe(0.67);
    expect(result.batches).toHaveLength(1);
  });
});
