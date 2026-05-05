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
  FractionAuction = 'fraction_auction',
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
  FractionAuction = 'fraction_auction',
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

export enum CapitalGainsAssessmentStatus {
  Ready = 'ready',
  Pending = 'pending',
  Unsupported = 'unsupported',
  Mixed = 'mixed',
}

export enum CapitalGainsAssetCategory {
  Stock = 'stock',
  Fii = 'fii',
  Etf = 'etf',
}

export enum CapitalGainsBlockerCode {
  MissingAssetCategory = 'missing_asset_category',
  MissingCostBasis = 'missing_cost_basis',
  AmbiguousCostBasis = 'ambiguous_cost_basis',
  DayTradeUnsupported = 'day_trade_unsupported',
  UnsupportedAssetType = 'unsupported_asset_type',
  UnsupportedOperation = 'unsupported_operation',
  MissingTransactionData = 'missing_transaction_data',
}

export enum CapitalGainsTraceClassification {
  ExemptStockGain = 'exempt_stock_gain',
  TaxableGain = 'taxable_gain',
  Loss = 'loss',
  CompensatedGain = 'compensated_gain',
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
