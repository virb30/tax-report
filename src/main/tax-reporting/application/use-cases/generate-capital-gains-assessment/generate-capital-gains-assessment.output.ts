import type {
  CapitalGainsAssessmentStatus,
  CapitalGainsAssetCategory,
  CapitalGainsBlockerCode,
  CapitalGainsTraceClassification,
  TransactionType,
} from '../../../../../shared/types/domain';

export interface CapitalGainsCategoryTotals {
  category: CapitalGainsAssetCategory;
  saleProceeds: number;
  taxableGain: number;
  exemptGain: number;
  loss: number;
  compensatedLoss: number;
  remainingLossBalance: number;
}

export interface CapitalGainsAnnualTotals {
  saleProceeds: number;
  taxableGain: number;
  exemptStockGain: number;
  loss: number;
  compensatedLoss: number;
  remainingLossBalance: number;
  categories: CapitalGainsCategoryTotals[];
}

export interface AssessmentBlockerOutput {
  code: CapitalGainsBlockerCode;
  message: string;
  month: string | null;
  ticker: string | null;
  category: CapitalGainsAssetCategory | null;
  sourceTransactionId: string | null;
  operationType: TransactionType | null;
}

export interface SaleTraceOutput {
  sourceTransactionId: string;
  date: string;
  ticker: string;
  category: CapitalGainsAssetCategory;
  saleQuantity: number;
  saleProceeds: number;
  acquisitionCostBasis: number;
  feesConsidered: number;
  averageCostBeforeSale: number;
  averageCostAfterSale: number;
  grossResult: number;
  exemptAmount: number;
  taxableAmount: number;
  lossGenerated: number;
  compensatedLossAmount: number;
  remainingCategoryLossBalance: number;
  classification: CapitalGainsTraceClassification;
}

export interface CapitalGainsMonth {
  month: string;
  status: CapitalGainsAssessmentStatus;
  categories: CapitalGainsCategoryTotals[];
  blockers: AssessmentBlockerOutput[];
  saleTraces: SaleTraceOutput[];
}

export interface GenerateCapitalGainsAssessmentOutput {
  baseYear: number;
  generatedAt: string;
  annualTotals: CapitalGainsAnnualTotals;
  months: CapitalGainsMonth[];
  summaryBlockers: AssessmentBlockerOutput[];
}
