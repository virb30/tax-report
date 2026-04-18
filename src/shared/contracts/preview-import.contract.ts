import type { TransactionType } from '../types/domain';
import type { ParsedTransactionBatch } from './import-transactions.contract';

export type PreviewImportTransactionsCommand = {
  filePath: string;
};

export type PreviewTransactionItem = {
  date: string;
  ticker: string;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
  fees: number;
  brokerId: string;
};

export type PreviewImportWarning = {
  row: number;
  message: string;
  type: 'BONUS_MISSING_COST' | string;
};

export type PreviewImportTransactionsResult = {
  batches: ParsedTransactionBatch[];
  transactionsPreview: PreviewTransactionItem[];
  warnings?: PreviewImportWarning[];
};

export type ConfirmImportTransactionsCommand = {
  filePath: string;
};

export type ConfirmImportTransactionsResult = {
  importedCount: number;
  recalculatedTickers: string[];
};
