export enum AssetType {
  Stock = 'stock',
  Fii = 'fii',
  Etf = 'etf',
  Bdr = 'bdr',
}

export enum OperationType {
  Buy = 'buy',
  Sell = 'sell',
  Bonus = 'bonus',
  Split = 'split',
  ReverseSplit = 'reverse_split',
  TransferIn = 'transfer_in',
  TransferOut = 'transfer_out',
}

export enum TransactionType {
  Buy = 'buy',
  Sell = 'sell',
  Bonus = 'bonus',
  Split = 'split',
  ReverseSplit = 'reverse_split',
  TransferIn = 'transfer_in',
  TransferOut = 'transfer_out',
  InitialBalance = 'initial_balance',
}

export enum SourceType {
  Pdf = 'pdf',
  Csv = 'csv',
  Manual = 'manual',
}

export type AveragePriceFeeMode = 'include' | 'ignore';

export enum AssetTypeSource {
  File = 'file',
  Manual = 'manual',
}

export enum AssetResolutionStatus {
  ResolvedFromFile = 'resolved_from_file',
  ResolvedFromCatalog = 'resolved_from_catalog',
  ManualOverride = 'manual_override',
  Unresolved = 'unresolved',
}

export enum UnsupportedImportReason {
  UnsupportedAssetType = 'unsupported_asset_type',
  UnsupportedEvent = 'unsupported_event',
}

export enum ReportItemStatus {
  Required = 'required',
  Optional = 'optional',
  BelowThreshold = 'below_threshold',
  Pending = 'pending',
  Unsupported = 'unsupported',
}

export enum PendingIssueCode {
  MissingAssetType = 'missing_asset_type',
  MissingIssuerName = 'missing_issuer_name',
  MissingIssuerCnpj = 'missing_issuer_cnpj',
  UnsupportedRow = 'unsupported_row',
  UnsupportedScope = 'unsupported_scope',
}

export type Asset = {
  id: number;
  ticker: string;
  name: string | null;
  cnpj: string | null;
  assetType: AssetType;
  broker: string;
  averagePrice: number;
  quantity: number;
  isManualBase: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Operation = {
  id: number;
  tradeDate: string;
  operationType: OperationType;
  ticker: string;
  quantity: number;
  unitPrice: number;
  operationalCosts: number;
  irrfWithheld: number;
  broker: string;
  sourceType: SourceType;
  importedAt: string;
  externalRef: string | null;
  importBatchId: string | null;
};
