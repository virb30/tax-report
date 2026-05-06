export enum AssetType {
  Stock = 'stock',
  Fii = 'fii',
  Etf = 'etf',
  Bdr = 'bdr',
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
