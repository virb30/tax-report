import { describe, expect, it, jest } from '@jest/globals';
import { TransactionType } from '../../../shared/types/domain';
import { PreviewImportUseCase } from './preview-import-use-case';
import type { ImportTransactionsParserPort } from '../ports/import-transactions-parser.port';

describe('PreviewImportUseCase', () => {
  it('parses and apportions fees without persisting', async () => {
    const mockParser: ImportTransactionsParserPort = {
      parse: jest.fn().mockResolvedValue([
        {
          tradeDate: '2025-04-01',
          brokerId: 'broker-xp',
          totalOperationalCosts: 1,
          operations: [
            { ticker: 'PETR4', type: TransactionType.Buy, quantity: 10, unitPrice: 20 },
            { ticker: 'VALE3', type: TransactionType.Sell, quantity: 5, unitPrice: 40 },
          ],
        },
      ]),
    };
    const taxApportioner = { allocate: jest.fn().mockReturnValue([0.33, 0.67]) };

    const useCase = new PreviewImportUseCase(mockParser, taxApportioner as never);

    const result = await useCase.execute({ filePath: '/tmp/ops.csv' });

    expect(mockParser.parse).toHaveBeenCalledWith('/tmp/ops.csv');
    expect(taxApportioner.allocate).toHaveBeenCalledWith({
      totalOperationalCosts: 1,
      operations: [
        { ticker: 'PETR4', quantity: 10, unitPrice: 20 },
        { ticker: 'VALE3', quantity: 5, unitPrice: 40 },
      ],
    });
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
