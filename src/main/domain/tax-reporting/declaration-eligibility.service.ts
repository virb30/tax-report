import { AssetType, ReportItemStatus } from '../../../shared/types/domain';

const STOCK_AND_BDR_THRESHOLD = 1000;
const FII_AND_ETF_THRESHOLD = 140;

export type DeclarationEligibilityInput = {
  assetType: AssetType;
  previousYearValue: number;
  currentYearValue: number;
  hasPendingIssues: boolean;
  isSupported: boolean;
};

export type DeclarationEligibilityOutput = {
  status: ReportItemStatus;
  reason: string;
};

export class DeclarationEligibilityService {
  evaluate(input: DeclarationEligibilityInput): DeclarationEligibilityOutput {
    if (!input.isSupported) {
      return {
        status: ReportItemStatus.Unsupported,
        reason: 'unsupported_scope',
      };
    }

    if (input.hasPendingIssues) {
      return {
        status: ReportItemStatus.Pending,
        reason: 'pending_issues',
      };
    }

    if (this.meetsThreshold(input.assetType, input.currentYearValue)) {
      return {
        status: ReportItemStatus.Required,
        reason: 'threshold_met',
      };
    }

    if (input.previousYearValue > 0) {
      return {
        status: ReportItemStatus.Optional,
        reason: 'held_in_previous_year',
      };
    }

    return {
      status: ReportItemStatus.BelowThreshold,
      reason: 'below_threshold',
    };
  }

  private meetsThreshold(assetType: AssetType, currentYearValue: number): boolean {
    switch (assetType) {
      case AssetType.Stock:
      case AssetType.Bdr:
        return currentYearValue >= STOCK_AND_BDR_THRESHOLD;
      case AssetType.Fii:
      case AssetType.Etf:
        return currentYearValue > FII_AND_ETF_THRESHOLD;
      default:
        return false;
    }
  }
}
