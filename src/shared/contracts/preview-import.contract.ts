import type { ParsedTransactionBatch } from './import-transactions.contract';

export type PreviewImportTransactionsCommand = {
  filePath: string;
};

export type PreviewTransactionItem = {
  date: string;
  ticker: string;
  type: 'buy' | 'sell';
  quantity: number;
  unitPrice: number;
  fees: number;
  brokerId: string;
};

export type PreviewImportTransactionsResult = {
  batches: ParsedTransactionBatch[];
  transactionsPreview: PreviewTransactionItem[];
};

export type ConfirmImportTransactionsCommand = {
  filePath: string;
};

export type ConfirmImportTransactionsResult = {
  importedCount: number;
  recalculatedTickers: string[];
};
