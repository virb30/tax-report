import type {
  AssetType,
  TransactionType,
  UnsupportedImportReason,
} from '../../../shared/types/domain';

export type ParsedTransactionOperation = {
  ticker: string;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
  sourceAssetType: AssetType | null;
  sourceAssetTypeLabel: string | null;
};

export type ParsedTransactionBatch = {
  tradeDate: string;
  brokerId: string;
  totalOperationalCosts: number;
  operations: ParsedTransactionOperation[];
};

export type UnsupportedParsedTransactionRow = {
  row: number;
  date: string;
  ticker: string;
  quantity: number;
  unitPrice: number;
  brokerId: string;
  sourceAssetType: AssetType | null;
  sourceAssetTypeLabel: string | null;
  unsupportedReason: UnsupportedImportReason.UnsupportedEvent;
};

export type ParsedTransactionFile = {
  batches: ParsedTransactionBatch[];
  unsupportedRows: UnsupportedParsedTransactionRow[];
};

export type ImportTransactionsCommand = {
  filePath: string;
};

export type ImportTransactionsResult = {
  importedCount: number;
  recalculatedTickers: string[];
};
