import type {
  AssetType,
  PendingIssueCode,
  ReportItemStatus,
} from '../../../../../shared/types/domain';

export interface RevenueClassification {
  group: string;
  code: string;
}

export interface PendingIssueOutput {
  code: PendingIssueCode;
  message: string;
}

export interface AssetsReportBrokerSummaryOutput {
  brokerId: string;
  brokerName: string;
  cnpj: string;
  quantity: number;
  totalCost: number;
}

export interface AssetsReportItem {
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
  pendingIssues: PendingIssueOutput[];
  canCopy: boolean;
  description: string | null;
  brokersSummary: AssetsReportBrokerSummaryOutput[];
}

export interface GenerateAssetReportOutput {
  referenceDate: string;
  items: AssetsReportItem[];
}
