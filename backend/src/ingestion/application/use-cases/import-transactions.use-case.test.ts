import {
  AssetType,
  type ParsedTransactionFile,
  TransactionType,
  UnsupportedImportReason,
} from '../../../shared/types/domain';
import { ImportTransactionsUseCase } from './import-transactions.use-case';
import type { ImportTransactionsParser } from '../interfaces/transactions.parser.interface';
import type { AssetRepository } from '../../../portfolio/application/repositories/asset.repository';
import type { TransactionRepository } from '../../../portfolio/application/repositories/transaction.repository';
import { mock, mockReset } from 'jest-mock-extended';
import type { ReallocateTransactionFeesService } from '../services/reallocate-transaction-fees.service';
import type { Queue } from '../../../shared/infra/events/queue.interface';
import { TransactionsImportedEvent } from '../../../shared/domain/events/transactions-imported.event';

describe('ImportTransactionsUseCase', () => {
  const mockParser = mock<ImportTransactionsParser>();
  const mockAssetRepo = mock<AssetRepository>();
  const mockTransactionRepo = mock<TransactionRepository>();
  const mockReallocator = mock<ReallocateTransactionFeesService>();
  const mockQueue = mock<Queue>();

  beforeEach(() => {
    mockReset(mockParser);
    mockReset(mockAssetRepo);
    mockReset(mockTransactionRepo);
    mockReset(mockReallocator);
    mockReset(mockQueue);
    mockAssetRepo.findByTickersList.mockResolvedValue([]);
    mockReallocator.execute.mockResolvedValue({
      recalculatedTickers: ['PETR4'],
      affectedPositions: [{ ticker: 'PETR4', year: 2025 }],
    });
    mockQueue.publish.mockResolvedValue(undefined);
  });

  function parsedFileWithBatches(batches: ParsedTransactionFile['batches']): ParsedTransactionFile {
    return {
      batches,
      unsupportedRows: [],
    };
  }

  function createUseCase(): ImportTransactionsUseCase {
    return new ImportTransactionsUseCase(
      mockParser,
      mockAssetRepo,
      mockTransactionRepo,
      mockReallocator,
      mockQueue,
    );
  }

  it('parses, persists transactions, reallocates fee projections and recalculates positions', async () => {
    const brokerId = '019cece0-4a22-75b8-95c4-45eb6f4cb2f4';
    mockParser.parse.mockResolvedValue(
      parsedFileWithBatches([
        {
          tradeDate: '2025-04-01',
          brokerId,
          totalOperationalCosts: 1,
          operations: [
            {
              ticker: 'PETR4',
              type: TransactionType.Buy,
              quantity: 10,
              unitPrice: 20,
              sourceAssetType: AssetType.Stock,
              sourceAssetTypeLabel: 'Acao',
            },
            {
              ticker: 'VALE3',
              type: TransactionType.Buy,
              quantity: 5,
              unitPrice: 40,
              sourceAssetType: AssetType.Stock,
              sourceAssetTypeLabel: 'Acao',
            },
          ],
        },
      ]),
    );
    mockTransactionRepo.saveMany.mockResolvedValue(undefined);
    mockTransactionRepo.findExistingExternalRefs.mockResolvedValue(new Set<string>());
    mockReallocator.execute.mockResolvedValue({
      recalculatedTickers: ['PETR4', 'VALE3'],
      affectedPositions: [
        { ticker: 'PETR4', year: 2025 },
        { ticker: 'VALE3', year: 2025 },
      ],
    });
    const useCase = createUseCase();

    const result = await useCase.execute({ filePath: '/tmp/ops.csv', assetTypeOverrides: [] });

    expect(mockParser.parse).toHaveBeenCalledWith('/tmp/ops.csv');
    expect(mockAssetRepo.save).toHaveBeenCalledTimes(2);
    expect(mockTransactionRepo.saveMany).toHaveBeenCalledTimes(1);
    const savedTransactions = mockTransactionRepo.saveMany.mock.calls[0]?.[0];
    expect(savedTransactions).toHaveLength(2);
    expect(savedTransactions[0]?.ticker).toBe('PETR4');
    expect(savedTransactions[0]?.fees.getAmount()).toBe('0');
    expect(savedTransactions[1]?.ticker).toBe('VALE3');
    expect(savedTransactions[1]?.fees.getAmount()).toBe('0');
    expect(mockReallocator.execute).toHaveBeenCalledWith({
      date: '2025-04-01',
      brokerId,
    });
    expect(result.importedCount).toBe(2);
    expect(result.recalculatedTickers).toContain('PETR4');
    expect(result.recalculatedTickers).toContain('VALE3');
    expect(result.skippedUnsupportedRows).toBe(0);
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
  });

  it('persists manual overrides before saving accepted transactions', async () => {
    const brokerId = '019cece0-4a22-75b8-95c4-45eb6f4cb2f4';
    mockParser.parse.mockResolvedValue(
      parsedFileWithBatches([
        {
          tradeDate: '2025-04-01',
          brokerId,
          totalOperationalCosts: 0,
          operations: [
            {
              ticker: 'PETR4',
              type: TransactionType.Buy,
              quantity: 1,
              unitPrice: 10,
              sourceAssetType: null,
              sourceAssetTypeLabel: null,
            },
          ],
        },
      ]),
    );
    mockTransactionRepo.saveMany.mockResolvedValue(undefined);
    mockTransactionRepo.findExistingExternalRefs.mockResolvedValue(new Set<string>());
    const useCase = createUseCase();

    const result = await useCase.execute({
      filePath: '/tmp/ops.csv',
      assetTypeOverrides: [{ ticker: 'PETR4', assetType: AssetType.Stock }],
    });

    expect(result).toEqual({
      importedCount: 1,
      recalculatedTickers: ['PETR4'],
      skippedUnsupportedRows: 0,
    });
    expect(mockAssetRepo.save).toHaveBeenCalledTimes(1);
    expect(mockAssetRepo.save.mock.invocationCallOrder[0]).toBeLessThan(
      mockTransactionRepo.saveMany.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
    expect(mockAssetRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: 'PETR4',
        assetType: 'stock',
        resolutionSource: 'manual',
      }),
    );
  });

  it('rejects confirmation when a supported ticker remains unresolved without an override', async () => {
    const brokerId = '019cece0-4a22-75b8-95c4-45eb6f4cb2f4';
    mockParser.parse.mockResolvedValue(
      parsedFileWithBatches([
        {
          tradeDate: '2025-04-01',
          brokerId,
          totalOperationalCosts: 0,
          operations: [
            {
              ticker: 'PETR4',
              type: TransactionType.Buy,
              quantity: 1,
              unitPrice: 10,
              sourceAssetType: null,
              sourceAssetTypeLabel: null,
            },
          ],
        },
      ]),
    );
    const useCase = createUseCase();

    await expect(
      useCase.execute({ filePath: '/tmp/ops.csv', assetTypeOverrides: [] }),
    ).rejects.toThrow(/PETR4/);

    expect(mockAssetRepo.save).not.toHaveBeenCalled();
    expect(mockTransactionRepo.saveMany).not.toHaveBeenCalled();
    expect(mockReallocator.execute).not.toHaveBeenCalled();
  });

  it('skips unsupported rows and recalculates only accepted supported rows', async () => {
    const brokerId = '019cece0-4a22-75b8-95c4-45eb6f4cb2f4';
    mockParser.parse.mockResolvedValue({
      batches: [
        {
          tradeDate: '2025-04-01',
          brokerId,
          totalOperationalCosts: 1,
          operations: [
            {
              ticker: 'PETR4',
              type: TransactionType.Buy,
              quantity: 10,
              unitPrice: 20,
              sourceAssetType: AssetType.Stock,
              sourceAssetTypeLabel: 'Acao',
            },
            {
              ticker: 'BTC11',
              type: TransactionType.Buy,
              quantity: 1,
              unitPrice: 100,
              sourceAssetType: null,
              sourceAssetTypeLabel: 'Cripto',
            },
          ],
        },
      ],
      unsupportedRows: [
        {
          row: 3,
          date: '2025-04-01',
          ticker: 'PETR4',
          quantity: 5,
          unitPrice: 0,
          brokerId,
          sourceAssetType: null,
          sourceAssetTypeLabel: null,
          unsupportedReason: UnsupportedImportReason.UnsupportedEvent,
        },
      ],
    });
    mockTransactionRepo.saveMany.mockResolvedValue(undefined);
    mockTransactionRepo.findExistingExternalRefs.mockResolvedValue(new Set<string>());
    const useCase = createUseCase();

    const result = await useCase.execute({ filePath: '/tmp/ops.csv', assetTypeOverrides: [] });

    expect(result).toEqual({
      importedCount: 1,
      recalculatedTickers: ['PETR4'],
      skippedUnsupportedRows: 2,
    });
    const savedTransactions = mockTransactionRepo.saveMany.mock.calls[0]?.[0];
    expect(savedTransactions).toHaveLength(1);
    expect(savedTransactions?.[0]?.ticker).toBe('PETR4');
    expect(savedTransactions?.[0]?.fees.getAmount()).toBe('0');
    expect(mockReallocator.execute).toHaveBeenCalledTimes(1);
    expect(mockAssetRepo.save).toHaveBeenCalledTimes(1);
    expect(mockAssetRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: 'PETR4',
      }),
    );
  });

  it('skips duplicates via externalRef (idempotence)', async () => {
    const brokerId = '019cece0-4a22-75b8-95c4-45eb6f4cb2f4';
    mockParser.parse.mockResolvedValue(
      parsedFileWithBatches([
        {
          tradeDate: '2025-04-01',
          brokerId,
          totalOperationalCosts: 0,
          operations: [
            {
              ticker: 'PETR4',
              type: TransactionType.Buy,
              quantity: 1,
              unitPrice: 10,
              sourceAssetType: AssetType.Stock,
              sourceAssetTypeLabel: 'Acao',
            },
          ],
        },
      ]),
    );
    mockTransactionRepo.saveMany.mockResolvedValue(undefined);

    let existingRefs = new Set<string>();
    mockTransactionRepo.findExistingExternalRefs.mockImplementation(async (refs: string[]) => {
      return new Promise((resolve) => {
        resolve(new Set(refs.filter((r) => existingRefs.has(r))));
      });
    });

    const useCase = createUseCase();

    const firstResult = await useCase.execute({ filePath: '/tmp/ops.csv', assetTypeOverrides: [] });
    expect(firstResult.importedCount).toBe(1);
    const savedRefs = (
      mockTransactionRepo.saveMany.mock.calls[0]?.[0] as Array<{ externalRef?: string }>
    )
      .map((t) => t.externalRef)
      .filter(Boolean) as string[];
    existingRefs = new Set(savedRefs);

    const secondResult = await useCase.execute({
      filePath: '/tmp/ops.csv',
      assetTypeOverrides: [],
    });

    expect(secondResult).toEqual({
      importedCount: 0,
      recalculatedTickers: [],
      skippedUnsupportedRows: 0,
    });
    expect(mockTransactionRepo.saveMany).toHaveBeenCalledTimes(1);
    expect(mockQueue.publish).toHaveBeenCalledTimes(1);
  });
});
