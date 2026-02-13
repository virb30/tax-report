import type { ImportOperationsResult } from '@shared/contracts/import-operations.contract';
import type { ParserFileType } from '../ports/brokerage-note-parser.port';
import type { OperationsFileParserPort } from '../ports/operations-file-parser.port';
import type { ImportOperationsUseCase } from './import-operations-use-case';

export class ImportOperationsFromFileUseCase {
  constructor(
    private readonly operationsFileParserPort: OperationsFileParserPort,
    private readonly importOperationsUseCase: ImportOperationsUseCase,
  ) {}

  async execute(input: {
    broker: string;
    filePath: string;
    importBatchId?: string;
  }): Promise<ImportOperationsResult> {
    const fileType = resolveFileTypeFromPath(input.filePath);
    const commands = await this.operationsFileParserPort.parse({
      broker: input.broker,
      fileType,
      filePath: input.filePath,
    });

    let createdOperationsCount = 0;
    let recalculatedPositionsCount = 0;

    for (const command of commands) {
      const result = await this.importOperationsUseCase.execute({
        ...command,
        importBatchId: input.importBatchId,
      });
      createdOperationsCount += result.createdOperationsCount;
      recalculatedPositionsCount += result.recalculatedPositionsCount;
    }

    return {
      createdOperationsCount,
      recalculatedPositionsCount,
    };
  }
}

function resolveFileTypeFromPath(filePath: string): ParserFileType {
  const normalizedFilePath = filePath.toLowerCase();

  if (normalizedFilePath.endsWith('.csv')) {
    return 'csv';
  }

  if (normalizedFilePath.endsWith('.xlsx')) {
    return 'xlsx';
  }

  if (normalizedFilePath.endsWith('.pdf')) {
    return 'pdf';
  }

  throw new Error('Unsupported file extension.');
}
