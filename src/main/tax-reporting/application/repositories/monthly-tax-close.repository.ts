export type MonthlyTaxWorkspaceState =
  | 'closed'
  | 'blocked'
  | 'obsolete'
  | 'needs_review'
  | 'below_threshold';

export type MonthlyTaxOutcome = 'no_tax' | 'exempt' | 'tax_due' | 'below_threshold' | 'blocked';

export type MonthlyTaxGroupCode = 'geral-comum' | 'geral-isento' | 'fii';

export interface MonthlyTaxGroupDetail {
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
}

export interface MonthlyTaxBlockedReason {
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
}

export interface MonthlyTaxDisclosure {
  code: 'unit_non_exempt_policy' | 'etf_non_exempt_policy' | 'manual_input_used';
  severity: 'info' | 'review';
  message: string;
}

export interface MonthlyTaxCarryForwardDetail {
  openingCommonLoss: string;
  closingCommonLoss: string;
  openingFiiLoss: string;
  closingFiiLoss: string;
  openingIrrfCredit: string;
  closingIrrfCredit: string;
  openingBelowThresholdTax: string;
  closingBelowThresholdTax: string;
}

export interface MonthlyTaxSaleLine {
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
  realizedResult: string;
  allocatedIrrf: string;
}

export interface MonthlyTaxCloseDetail {
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
}

export interface MonthlyTaxCloseSummary {
  month: string;
  state: MonthlyTaxWorkspaceState;
  outcome: MonthlyTaxOutcome;
  calculationVersion: string;
  inputFingerprint: string;
  calculatedAt: string;
  netTaxDue: string;
  carryForwardOut: string;
  changeSummary: string | null;
}

export interface MonthlyTaxCloseArtifact extends MonthlyTaxCloseSummary {
  detail: MonthlyTaxCloseDetail;
}

export interface MonthlyTaxCloseRepository {
  save(close: MonthlyTaxCloseArtifact): Promise<void>;
  findHistory(): Promise<MonthlyTaxCloseSummary[]>;
  findDetail(month: string): Promise<MonthlyTaxCloseArtifact | null>;
  deleteFromYear(year: number): Promise<void>;
}
