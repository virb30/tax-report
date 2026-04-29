import type { AssetType, TransactionType } from '../types/domain';
import type { ParsedTransactionBatch } from './import-transactions.contract';
import type {
  ImportPreviewReviewState,
  ImportPreviewSummary,
} from './import-preview-review.contract';

export type PreviewImportTransactionsCommand = {
  filePath: string;
};

export type PreviewTransactionItem = ImportPreviewReviewState & {
  date: string;
  ticker: string;
  type: TransactionType | null;
  quantity: number;
  unitPrice: number;
  fees: number;
  brokerId: string;
  sourceAssetType: AssetType | null;
};

export type PreviewImportWarning = {
  row: number;
  message: string;
  type: string;
};

export type PreviewImportTransactionsResult = {
  batches: ParsedTransactionBatch[];
  transactionsPreview: PreviewTransactionItem[];
  summary: ImportPreviewSummary;
  warnings?: PreviewImportWarning[];
};

export type ConfirmImportTransactionsCommand = {
  filePath: string;
};

export type ConfirmImportTransactionsResult = {
  importedCount: number;
  recalculatedTickers: string[];
};
