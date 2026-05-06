import type { AssetType, PendingIssueCode, ReportItemStatus } from '../domain';

export type GenerateAssetsReportQuery = {
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

export type GenerateAssetsReportResult = {
  referenceDate: string;
  items: AssetsReportItem[];
};
