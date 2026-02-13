import type { ImportOperationsCommand } from '@shared/contracts/import-operations.contract';

export type ParserFileType = 'pdf' | 'csv' | 'xlsx';

export interface BrokerageNoteParserPort {
  supports(input: { broker: string; fileType: ParserFileType }): boolean;
  parse(filePath: string): Promise<ImportOperationsCommand>;
}
