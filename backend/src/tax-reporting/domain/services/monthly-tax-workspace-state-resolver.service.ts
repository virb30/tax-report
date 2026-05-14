import type {
  MonthlyTaxBlockedReason,
  MonthlyTaxCloseDetail,
  MonthlyTaxDisclosure,
  MonthlyTaxOutcome,
  MonthlyTaxWorkspaceState,
} from '../../application/repositories/monthly-tax-close.repository';

const MINIMUM_COLLECTION_AMOUNT = 10;

export interface MonthlyTaxStateInput {
  blockedReasons: MonthlyTaxBlockedReason[];
  disclosures: MonthlyTaxDisclosure[];
  netTaxDue: string;
  hasExemptSales: boolean;
  hasTaxableSales: boolean;
  changeSummary: string | null;
  isObsolete?: boolean;
}

export interface MonthlyTaxStateResult {
  state: MonthlyTaxWorkspaceState;
  outcome: MonthlyTaxOutcome;
}

export class MonthlyTaxWorkspaceStateResolverService {
  resolveFromDetail(
    detail: MonthlyTaxCloseDetail,
    input: Pick<MonthlyTaxStateInput, 'changeSummary' | 'isObsolete'>,
  ): MonthlyTaxStateResult {
    return this.resolve({
      blockedReasons: detail.blockedReasons,
      disclosures: detail.disclosures,
      netTaxDue: detail.summary.netTaxDue,
      hasExemptSales: detail.groups.some(
        (group) => group.code === 'geral-isento' && Number(group.grossSales) > 0,
      ),
      hasTaxableSales: detail.groups.some(
        (group) => group.code !== 'geral-isento' && Number(group.grossSales) > 0,
      ),
      changeSummary: input.changeSummary,
      isObsolete: input.isObsolete,
    });
  }

  resolve(input: MonthlyTaxStateInput): MonthlyTaxStateResult {
    if (input.isObsolete) {
      return {
        state: 'obsolete',
        outcome: this.resolveFinalOutcome(input),
      };
    }

    if (input.blockedReasons.length > 0) {
      return {
        state: 'blocked',
        outcome: 'blocked',
      };
    }

    if (this.isBelowThreshold(input.netTaxDue)) {
      return {
        state: 'below_threshold',
        outcome: 'below_threshold',
      };
    }

    if (this.needsReview(input)) {
      return {
        state: 'needs_review',
        outcome: this.resolveFinalOutcome(input),
      };
    }

    return {
      state: 'closed',
      outcome: this.resolveFinalOutcome(input),
    };
  }

  private resolveFinalOutcome(input: MonthlyTaxStateInput): MonthlyTaxOutcome {
    if (input.blockedReasons.length > 0) {
      return 'blocked';
    }

    if (this.isBelowThreshold(input.netTaxDue)) {
      return 'below_threshold';
    }

    if (Number(input.netTaxDue) >= MINIMUM_COLLECTION_AMOUNT) {
      return 'tax_due';
    }

    if (input.hasExemptSales && !input.hasTaxableSales) {
      return 'exempt';
    }

    return 'no_tax';
  }

  private needsReview(input: MonthlyTaxStateInput): boolean {
    return (
      Boolean(input.changeSummary) || input.disclosures.some((item) => item.severity === 'review')
    );
  }

  private isBelowThreshold(netTaxDue: string): boolean {
    const amount = Number(netTaxDue);
    return amount > 0 && amount < MINIMUM_COLLECTION_AMOUNT;
  }
}
