import type { ParsedTransactionFile } from '../../../shared/types/domain';

export interface ImportTransactionsParser {
  parse(filePath: string): Promise<ParsedTransactionFile>;
}
