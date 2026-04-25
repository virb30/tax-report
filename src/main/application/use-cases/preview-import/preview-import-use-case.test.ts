
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
      type: TransactionType.Buy,
      quantity: 10,
      unitPrice: 20,
      fees: 0.33,
      brokerId: 'broker-xp',
    });
    expect(result.transactionsPreview[1]?.fees).toBe(0.67);
    expect(result.transactionsPreview[1]?.type).toBe(TransactionType.Sell);
    expect(result.batches).toHaveLength(1);
    expect(result.warnings).toBeUndefined();
  });

  it('triggers BONUS_MISSING_COST warning when Bonus transaction has zero unit price', async () => {
    mockParser.parse.mockResolvedValue([
      {
        tradeDate: '2025-04-01',
        brokerId: 'broker-xp',
        totalOperationalCosts: 0,
        operations: [
          { ticker: 'PETR4', type: TransactionType.Bonus, quantity: 10, unitPrice: 0 },
        ],
      },
    ]);
    const taxApportioner = new TaxApportioner();
    const useCase = new PreviewImportUseCase(mockParser, taxApportioner);

    const result = await useCase.execute({ filePath: '/tmp/ops.csv' });

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings?.[0]).toMatchObject({
      row: 1,
      type: 'BONUS_MISSING_COST',
      message: expect.stringContaining('PETR4'),
    });
  });

  it('flows Split and Transfer transactions correctly', async () => {
    mockParser.parse.mockResolvedValue([
      {
        tradeDate: '2025-04-01',
        brokerId: 'broker-xp',
        totalOperationalCosts: 0,
        operations: [
          { ticker: 'PETR4', type: TransactionType.Split, quantity: 2, unitPrice: 0 },
          { ticker: 'VALE3', type: TransactionType.TransferIn, quantity: 100, unitPrice: 35 },
        ],
      },
    ]);
    const taxApportioner = new TaxApportioner();
    const useCase = new PreviewImportUseCase(mockParser, taxApportioner);

    const result = await useCase.execute({ filePath: '/tmp/ops.csv' });

    expect(result.transactionsPreview).toHaveLength(2);
    expect(result.transactionsPreview[0]?.type).toBe(TransactionType.Split);
    expect(result.transactionsPreview[1]?.type).toBe(TransactionType.TransferIn);
    expect(result.warnings).toBeUndefined();
  });
});
