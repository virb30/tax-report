import type { ParsedTransactionBatch } from '@shared/contracts/import-transactions.contract';

export interface ImportTransactionsParser {
  parse(filePath: string): Promise<ParsedTransactionBatch[]>;
}
