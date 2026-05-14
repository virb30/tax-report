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

export type ApiErrorKind = 'validation' | 'not_found' | 'conflict' | 'business' | 'unexpected';

export type ApiResultError = {
  code: string;
  message: string;
  kind: ApiErrorKind;
  details?: unknown;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: ApiResultError;
    };

export type BrokerListItem = {
  id: string;
  name: string;
  cnpj: string;
  code: string;
  active: boolean;
};

export type ListBrokersRequest = {
  activeOnly?: boolean;
};

export type ListBrokersResponse = {
  items: BrokerListItem[];
};

export type CreateBrokerRequest = {
  name: string;
  cnpj: string;
  code: string;
};

export type CreateBrokerResponse =
  | { success: true; broker: BrokerListItem }
  | { success: false; error: string };

export type UpdateBrokerRequest = {
  id: string;
  name?: string;
  cnpj?: string;
  code?: string;
};

export type UpdateBrokerResponse =
  | { success: true; broker: BrokerListItem }
  | { success: false; error: string };

export type ToggleBrokerActiveRequest = {
  id: string;
};

export type ToggleBrokerActiveResponse =
  | { success: true; broker: BrokerListItem }
  | { success: false; error: string };

export type AssetCatalogItem = {
  ticker: string;
  assetType: AssetType | null;
  resolutionSource: AssetTypeSource | null;
  name: string | null;
  cnpj: string | null;
  isReportReadyMetadata: boolean;
};

export type ListAssetsRequest = {
  pendingOnly?: boolean;
  reportBlockingOnly?: boolean;
};

export type ListAssetsResponse = {
  items: AssetCatalogItem[];
};

export type UpdateAssetRequest = {
  ticker: string;
  assetType?: AssetType;
  name?: string;
  cnpj?: string;
};

export type UpdateAssetResponse =
  | { success: true; asset: AssetCatalogItem }
  | { success: false; error: string };

export type RepairAssetTypeRequest = {
  ticker: string;
  assetType: AssetType;
};

export type RepairAssetTypeResponse =
  | {
      success: true;
      repair: {
        ticker: string;
        assetType: AssetType;
        affectedYears: number[];
        reprocessedCount: number;
      };
    }
  | { success: false; error: string };

export type InitialBalanceAllocationInput = {
  brokerId: string;
  quantity: string;
};

export type InitialBalanceDocument = {
  ticker: string;
  year: number;
  assetType: AssetType;
  name?: string | null;
  cnpj?: string | null;
  averagePrice: string;
  allocations: InitialBalanceAllocationInput[];
  totalQuantity: string;
};

export type SaveInitialBalanceDocumentRequest = {
  ticker: string;
  year: number;
  assetType: AssetType;
  name?: string;
  cnpj?: string;
  averagePrice: string;
  allocations: InitialBalanceAllocationInput[];
};

export type SaveInitialBalanceDocumentResponse = ApiResult<InitialBalanceDocument>;

export type ListInitialBalanceDocumentsRequest = {
  year: number;
};

export type ListInitialBalanceDocumentsResponse = ApiResult<{
  items: InitialBalanceDocument[];
}>;

export type DeleteInitialBalanceDocumentRequest = {
  ticker: string;
  year: number;
};

export type DeleteInitialBalanceDocumentResponse = ApiResult<{
  deleted: boolean;
}>;

export type ListPositionsRequest = {
  baseYear: number;
};

export type BrokerBreakdownItem = {
  brokerId: string;
  brokerName: string;
  brokerCnpj: string;
  quantity: string;
};

export type PositionListItem = {
  ticker: string;
  assetType: AssetType;
  totalQuantity: string;
  averagePrice: string;
  totalCost: string;
  brokerBreakdown: BrokerBreakdownItem[];
};

export type ListPositionsResponse = ApiResult<{
  items: PositionListItem[];
}>;

export type RecalculatePositionRequest = {
  ticker: string;
  year: number;
  averagePriceFeeMode?: AveragePriceFeeMode;
};

export type RecalculatePositionResponse = ApiResult<void>;
export type RecalculatePositionCommand = RecalculatePositionRequest;
export type RecalculatePositionResult = RecalculatePositionResponse;

export type DeletePositionRequest = {
  ticker: string;
  year: number;
};

export type DeletePositionResponse = ApiResult<{
  deleted: boolean;
}>;

export type DeleteAllPositionsRequest = {
  year: number;
};

export type DeleteAllPositionsResponse = ApiResult<{
  deletedCount: number;
}>;

export type MigrateYearRequest = {
  sourceYear: number;
  targetYear: number;
};

export type MigrateYearResponse = ApiResult<{
  migratedPositionsCount: number;
  createdTransactionsCount: number;
  message?: string;
}>;
export type MigrateYearCommand = MigrateYearRequest;
export type MigrateYearResult = MigrateYearResponse;

export type AssetTypeOverrideDecision = {
  ticker: string;
  assetType: AssetType;
};

export type ImportPreviewReviewState = {
  resolvedAssetType: AssetType | null;
  resolutionStatus: AssetResolutionStatus;
  needsReview: boolean;
  unsupportedReason: UnsupportedImportReason | null;
};

export type ImportPreviewSummary = {
  supportedRows: number;
  pendingRows: number;
  unsupportedRows: number;
};

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

export type FileUploadRequest = {
  file: File;
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

export type ImportPreviewResponse = {
  batches: ParsedTransactionBatch[];
  transactionsPreview: PreviewTransactionItem[];
  summary: ImportPreviewSummary;
  warnings?: PreviewImportWarning[];
};
export type PreviewImportTransactionsCommand = FileUploadRequest;
export type PreviewImportTransactionsResult = ImportPreviewResponse;

export type ConfirmImportRequest = {
  file: File;
  assetTypeOverrides: AssetTypeOverrideDecision[];
};

export type ConfirmImportResponse = {
  importedCount: number;
  recalculatedTickers: string[];
  skippedUnsupportedRows: number;
};
export type ConfirmImportTransactionsCommand = ConfirmImportRequest;
export type ConfirmImportTransactionsResult = ConfirmImportResponse;

export type DailyBrokerTaxItem = {
  date: string;
  brokerId: string;
  brokerCode: string;
  brokerName: string;
  fees: number;
  irrf: number;
};

export type ListDailyBrokerTaxesResponse = {
  items: DailyBrokerTaxItem[];
};

export type SaveDailyBrokerTaxRequest = {
  date: string;
  brokerId: string;
  fees: number;
  irrf: number;
};

export type SaveDailyBrokerTaxResponse = {
  tax: DailyBrokerTaxItem;
  recalculatedTickers: string[];
};

export type ImportDailyBrokerTaxesResponse = {
  importedCount: number;
  recalculatedTickers: string[];
};
export type ImportDailyBrokerTaxesCommand = FileUploadRequest;

export type DeleteDailyBrokerTaxRequest = {
  date: string;
  brokerId: string;
};

export type DeleteDailyBrokerTaxResponse = {
  deleted: boolean;
  recalculatedTickers: string[];
};

export type PreviewConsolidatedPositionResponse = ApiResult<{
  rows: ConsolidatedPositionPreviewRow[];
  summary: ImportPreviewSummary;
}>;
export type PreviewConsolidatedPositionCommand = FileUploadRequest;
export type PreviewConsolidatedPositionResult = PreviewConsolidatedPositionResponse;

export type ConsolidatedPositionPreviewRow = ImportPreviewReviewState & {
  ticker: string;
  quantity: number;
  averagePrice: number;
  brokerCode: string;
  sourceAssetType: AssetType | null;
};

export type ImportConsolidatedPositionRequest = {
  file: File;
  year: number;
  assetTypeOverrides: AssetTypeOverrideDecision[];
};

export type ImportConsolidatedPositionResponse = ApiResult<{
  importedCount: number;
  recalculatedTickers: string[];
  skippedUnsupportedRows: number;
}>;
export type ImportConsolidatedPositionCommand = ImportConsolidatedPositionRequest;
export type ImportConsolidatedPositionResult = ImportConsolidatedPositionResponse;

export type MonthlyTaxWorkspaceState =
  | 'closed'
  | 'blocked'
  | 'obsolete'
  | 'needs_review'
  | 'below_threshold';

export type MonthlyTaxOutcome = 'no_tax' | 'exempt' | 'tax_due' | 'below_threshold' | 'blocked';

export type MonthlyTaxGroupCode = 'geral-comum' | 'geral-isento' | 'fii';

export type MonthlyTaxHistoryRequest = {
  startYear?: number;
};

export type MonthlyTaxCloseSummary = {
  month: string;
  state: MonthlyTaxWorkspaceState;
  outcome: MonthlyTaxOutcome;
  calculationVersion: string;
  inputFingerprint: string;
  calculatedAt: string;
  netTaxDue: string;
  carryForwardOut: string;
  changeSummary: string | null;
};

export type MonthlyTaxHistoryResponse = {
  months: MonthlyTaxCloseSummary[];
};
export type MonthlyTaxHistoryQuery = MonthlyTaxHistoryRequest;
export type MonthlyTaxHistoryResult = MonthlyTaxHistoryResponse;

export type MonthlyTaxDetailRequest = {
  month: string;
};

export type MonthlyTaxGroupDetail = {
  code: MonthlyTaxGroupCode;
  label: 'Geral - Comum' | 'Geral - Isento' | 'FII';
  grossSales: string;
  realizedResult: string;
  carriedLossIn: string;
  carriedLossOut: string;
  taxableBase: string;
  taxRate: string;
  taxDue: string;
  irrfCreditUsed: string;
};

export type MonthlyTaxBlockedReason = {
  code:
    | 'day_trade_not_supported'
    | 'missing_daily_broker_tax'
    | 'non_positive_supported_sale_total'
    | 'unsupported_asset_class'
    | 'insufficient_position';
  message: string;
  repairTarget?: {
    tab: 'import' | 'assets' | 'brokers';
    hintCode: 'daily_broker_tax' | 'irrf' | 'asset_type' | 'broker_metadata';
  };
  metadata?: Record<string, string | string[]>;
};

export type MonthlyTaxDisclosure = {
  code: 'unit_non_exempt_policy' | 'etf_non_exempt_policy' | 'manual_input_used';
  severity: 'info' | 'review';
  message: string;
};

export type MonthlyTaxCarryForwardDetail = {
  openingCommonLoss: string;
  closingCommonLoss: string;
  openingFiiLoss: string;
  closingFiiLoss: string;
  openingIrrfCredit: string;
  closingIrrfCredit: string;
  openingBelowThresholdTax: string;
  closingBelowThresholdTax: string;
};

export type MonthlyTaxSaleLine = {
  id: string;
  date: string;
  ticker: string;
  brokerId: string;
  groupCode: MonthlyTaxGroupCode;
  assetClass: string;
  quantity: string;
  grossAmount: string;
  costBasis: string;
  fees: string;
  netSaleValue: string;
  realizedResult: string;
  allocatedIrrf: string;
};

export type MonthlyTaxCloseDetail = {
  summary: {
    month: string;
    state: MonthlyTaxWorkspaceState;
    outcome: MonthlyTaxOutcome;
    grossSales: string;
    realizedResult: string;
    taxBeforeCredits: string;
    irrfCreditUsed: string;
    netTaxDue: string;
  };
  groups: MonthlyTaxGroupDetail[];
  blockedReasons: MonthlyTaxBlockedReason[];
  disclosures: MonthlyTaxDisclosure[];
  carryForward: MonthlyTaxCarryForwardDetail;
  saleLines: MonthlyTaxSaleLine[];
};

export type MonthlyTaxDetailResponse = {
  detail: MonthlyTaxCloseDetail | null;
};
export type MonthlyTaxDetailQuery = MonthlyTaxDetailRequest;
export type MonthlyTaxDetailResult = MonthlyTaxDetailResponse;

export type RecalculateMonthlyTaxHistoryRequest = {
  startYear: number;
  reason: 'manual';
};

export type RecalculateMonthlyTaxHistoryResponse = {
  startMonth: string | null;
  endMonth: string | null;
  rebuiltMonths: string[];
  changedMonthCount: number;
  recalculatedAt: string;
};
export type RecalculateMonthlyTaxHistoryCommand = RecalculateMonthlyTaxHistoryRequest;
export type RecalculateMonthlyTaxHistoryResult = RecalculateMonthlyTaxHistoryResponse;

export type GenerateAssetsReportRequest = {
  baseYear: number;
};

export type RevenueClassification = {
  group: string;
  code: string;
};

export type PendingIssue = {
  code: PendingIssueCode;
  message: string;
};

export type AssetsReportBrokerSummary = {
  brokerId: string;
  brokerName: string;
  cnpj: string;
  quantity: number;
  totalCost: number;
};

export type AssetsReportItem = {
  ticker: string;
  assetType: AssetType;
  totalQuantity: number;
  averagePrice: number;
  previousYearValue: number;
  currentYearValue: number;
  acquiredInYear: boolean;
  revenueClassification: RevenueClassification;
  status: ReportItemStatus;
  eligibilityReason: string;
  pendingIssues: PendingIssue[];
  canCopy: boolean;
  description: string | null;
  brokersSummary: AssetsReportBrokerSummary[];
};

export type GenerateAssetsReportResponse = {
  referenceDate: string;
  items: AssetsReportItem[];
};
export type GenerateAssetsReportQuery = GenerateAssetsReportRequest;
export type GenerateAssetsReportResult = GenerateAssetsReportResponse;

export type ListAssetsQuery = ListAssetsRequest;
export type ListAssetsResult = ListAssetsResponse;
export type UpdateAssetCommand = UpdateAssetRequest;
export type UpdateAssetResult = UpdateAssetResponse;
export type RepairAssetTypeCommand = RepairAssetTypeRequest;
export type RepairAssetTypeResult = RepairAssetTypeResponse;
export type ListBrokersQuery = ListBrokersRequest;
export type ListBrokersResult = ListBrokersResponse;
export type CreateBrokerCommand = CreateBrokerRequest;
export type CreateBrokerResult = CreateBrokerResponse;
export type UpdateBrokerCommand = UpdateBrokerRequest;
export type UpdateBrokerResult = UpdateBrokerResponse;
export type ToggleBrokerActiveCommand = ToggleBrokerActiveRequest;
export type ToggleBrokerActiveResult = ToggleBrokerActiveResponse;
export type SaveInitialBalanceDocumentCommand = SaveInitialBalanceDocumentRequest;
export type SaveInitialBalanceDocumentResult = SaveInitialBalanceDocumentResponse;
export type ListInitialBalanceDocumentsQuery = ListInitialBalanceDocumentsRequest;
export type ListInitialBalanceDocumentsResult = ListInitialBalanceDocumentsResponse;
export type DeleteInitialBalanceDocumentCommand = DeleteInitialBalanceDocumentRequest;
export type DeleteInitialBalanceDocumentResult = DeleteInitialBalanceDocumentResponse;
export type ListPositionsQuery = ListPositionsRequest;
export type ListPositionsResult = ListPositionsResponse;
export type DeletePositionCommand = DeletePositionRequest;
export type DeletePositionResult = DeletePositionResponse;
export type DeleteAllPositionsCommand = DeleteAllPositionsRequest;
export type DeleteAllPositionsResult = DeleteAllPositionsResponse;
export type SaveDailyBrokerTaxCommand = SaveDailyBrokerTaxRequest;
export type SaveDailyBrokerTaxResult = SaveDailyBrokerTaxResponse;
export type ListDailyBrokerTaxesResult = ListDailyBrokerTaxesResponse;
export type ImportDailyBrokerTaxesResult = ImportDailyBrokerTaxesResponse;
export type DeleteDailyBrokerTaxCommand = DeleteDailyBrokerTaxRequest;
export type DeleteDailyBrokerTaxResult = DeleteDailyBrokerTaxResponse;
