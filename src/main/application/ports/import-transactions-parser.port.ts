import type { ParsedTransactionBatch } from '@shared/contracts/import-transactions.contract';

export interface ImportTransactionsParserPort {
  parse(filePath: string): Promise<ParsedTransactionBatch[]>;
}
