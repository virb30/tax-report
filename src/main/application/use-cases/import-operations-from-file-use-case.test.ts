import { describe, expect, it, jest } from '@jest/globals';
import { SourceType } from '../../../shared/types/domain';
import { ImportOperationsFromFileUseCase } from './import-operations-from-file-use-case';
import type { ImportOperationsUseCase } from './import-operations-use-case';
import type { OperationsFileParserPort } from '../ports/operations-file-parser.port';

describe('ImportOperationsFromFileUseCase', () => {
  it('parses file and executes import use case', async () => {
    const parseMock = jest.fn().mockResolvedValue([
      {
        tradeDate: '2025-01-01',
        broker: 'XP',
        sourceType: SourceType.Csv,
        totalOperationalCosts: 0,
        operations: [],
      },
    ]);
    const parserStrategy = {
      parse: parseMock,
    } as unknown as OperationsFileParserPort;
    const executeMock = jest.fn().mockResolvedValue({
      createdOperationsCount: 1,
      recalculatedPositionsCount: 1,
    });
    const importOperationsUseCase = {
      execute: executeMock,
    } as unknown as ImportOperationsUseCase;
    const useCase = new ImportOperationsFromFileUseCase(parserStrategy, importOperationsUseCase);

    const result = await useCase.execute({
      broker: 'XP',
      filePath: '/tmp/file.csv',
      importBatchId: 'batch-001',
    });

    expect(parseMock).toHaveBeenCalledWith({
      broker: 'XP',
      fileType: 'csv',
      filePath: '/tmp/file.csv',
    });
    expect(executeMock).toHaveBeenCalledWith({
      tradeDate: '2025-01-01',
      broker: 'XP',
      sourceType: SourceType.Csv,
      totalOperationalCosts: 0,
      operations: [],
      importBatchId: 'batch-001',
    });
    expect(result.createdOperationsCount).toBe(1);
  });

  it('resolves xlsx and pdf extensions and fails for unknown extension', async () => {
    const parseMock = jest.fn().mockResolvedValue([
      {
        tradeDate: '2025-01-01',
        broker: 'XP',
        sourceType: SourceType.Csv,
        totalOperationalCosts: 0,
        operations: [],
      },
    ]);
    const parserStrategy = {
      parse: parseMock,
    } as unknown as OperationsFileParserPort;
    const importOperationsUseCase = {
      execute: jest.fn().mockResolvedValue({
        createdOperationsCount: 0,
        recalculatedPositionsCount: 0,
      }),
    } as unknown as ImportOperationsUseCase;
    const useCase = new ImportOperationsFromFileUseCase(parserStrategy, importOperationsUseCase);

    await useCase.execute({
      broker: 'XP',
      filePath: '/tmp/file.xlsx',
    });
    expect(parseMock).toHaveBeenCalledWith({
      broker: 'XP',
      fileType: 'xlsx',
      filePath: '/tmp/file.xlsx',
    });

    await useCase.execute({
      broker: 'XP',
      filePath: '/tmp/file.pdf',
    });
    expect(parseMock).toHaveBeenCalledWith({
      broker: 'XP',
      fileType: 'pdf',
      filePath: '/tmp/file.pdf',
    });

    await useCase.execute({
      broker: 'XP',
      filePath: '/tmp/file.CSV',
    });
    expect(parseMock).toHaveBeenCalledWith({
      broker: 'XP',
      fileType: 'csv',
      filePath: '/tmp/file.CSV',
    });

    await expect(
      useCase.execute({
        broker: 'XP',
        filePath: '/tmp/file.txt',
      }),
    ).rejects.toThrow('Unsupported file extension.');
  });
});
