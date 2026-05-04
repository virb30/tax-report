import type { AssetType, PendingIssueCode, ReportItemStatus } from '../../../shared/types/domain';

export interface ReportItemPendingIssueOutput {
  code: PendingIssueCode;
  message: string;
}

export interface ReportItemBrokerSummaryOutput {
  brokerId: string;
  brokerName: string;
  cnpj: string;
  quantity: number;
  totalCost: number;
}

export interface ReportItemOutput {
  ticker: string;
  assetType: AssetType;
  totalQuantity: number;
  averagePrice: number;
  previousYearValue: number;
  currentYearValue: number;
  acquiredInYear: boolean;
  revenueClassification: { group: string; code: string };
  status: ReportItemStatus;
  eligibilityReason: string;
  pendingIssues: ReportItemPendingIssueOutput[];
  canCopy: boolean;
  description: string | null;
  brokersSummary: ReportItemBrokerSummaryOutput[];
}
