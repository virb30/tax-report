import type { ParsedTransactionFile } from '../../../../preload/contracts/ingestion/import-transactions.contract';

export interface ImportTransactionsParser {
  parse(filePath: string): Promise<ParsedTransactionFile>;
}
