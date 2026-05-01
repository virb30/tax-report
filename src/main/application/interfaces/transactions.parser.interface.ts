import type { ParsedTransactionFile } from '../../../shared/contracts/import-transactions.contract';

export interface ImportTransactionsParser {
  parse(filePath: string): Promise<ParsedTransactionFile>;
}
