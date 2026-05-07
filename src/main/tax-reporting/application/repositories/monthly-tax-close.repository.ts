export type MonthlyTaxWorkspaceState =
  | 'closed'
  | 'blocked'
  | 'obsolete'
  | 'needs_review'
  | 'below_threshold';

export type MonthlyTaxOutcome = 'no_tax' | 'exempt' | 'tax_due' | 'below_threshold' | 'blocked';

export type MonthlyTaxCloseDetail = unknown;

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
