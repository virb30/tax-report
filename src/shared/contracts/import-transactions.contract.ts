import type { TransactionType } from '@shared/types/domain';

export type ParsedTransactionOperation = {
  ticker: string;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
};

export type ParsedTransactionBatch = {
  tradeDate: string;
  brokerId: string;
  totalOperationalCosts: number;
  operations: ParsedTransactionOperation[];
};

export type ImportTransactionsCommand = {
  filePath: string;
};

export type ImportTransactionsResult = {
  importedCount: number;
  recalculatedTickers: string[];
};
