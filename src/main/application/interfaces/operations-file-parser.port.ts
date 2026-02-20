import type { ImportOperationsCommand } from '@shared/contracts/import-operations.contract';
import type { ParserFileType } from './brokerage-note-parser.port';

export type ParseOperationsFileInput = {
  broker: string;
  fileType: ParserFileType;
  filePath: string;
};

export interface OperationsFileParserPort {
  parse(input: ParseOperationsFileInput): Promise<ImportOperationsCommand[]>;
}
