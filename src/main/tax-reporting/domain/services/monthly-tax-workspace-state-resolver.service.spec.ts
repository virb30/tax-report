import type { MonthlyTaxCloseDetail } from '../../application/repositories/monthly-tax-close.repository';
import { MonthlyTaxWorkspaceStateResolverService } from './monthly-tax-workspace-state-resolver.service';

function createDetail(overrides: Partial<MonthlyTaxCloseDetail> = {}): MonthlyTaxCloseDetail {
  return {
    summary: {
      month: '2026-01',
      state: 'closed',
      outcome: 'no_tax',
      grossSales: '0.00',
      realizedResult: '0.00',
      taxBeforeCredits: '0.00',
      irrfCreditUsed: '0.00',
      netTaxDue: '0.00',
    },
    groups: [],
    blockedReasons: [],
    disclosures: [],
    carryForward: {
      openingCommonLoss: '0.00',
      closingCommonLoss: '0.00',
      openingFiiLoss: '0.00',
      closingFiiLoss: '0.00',
      openingIrrfCredit: '0.00',
      closingIrrfCredit: '0.00',
      openingBelowThresholdTax: '0.00',
      closingBelowThresholdTax: '0.00',
    },
    saleLines: [],
    ...overrides,
  };
}

describe('MonthlyTaxWorkspaceStateResolverService', () => {
  const service = new MonthlyTaxWorkspaceStateResolverService();

  it('derives blocked, obsolete, needs-review, below-threshold, and closed states from artifact facts', () => {
    expect(
      service.resolveFromDetail(
        createDetail({
          blockedReasons: [
            {
              code: 'day_trade_not_supported',
              message: 'Blocked',
            },
          ],
        }),
        { changeSummary: null },
      ),
    ).toEqual({ state: 'blocked', outcome: 'blocked' });

    expect(
      service.resolveFromDetail(createDetail(), { changeSummary: null, isObsolete: true }),
    ).toEqual({
      state: 'obsolete',
      outcome: 'no_tax',
    });

    expect(
      service.resolveFromDetail(
        createDetail({
          disclosures: [
            {
              code: 'unit_non_exempt_policy',
              severity: 'review',
              message: 'Review policy',
            },
          ],
        }),
        { changeSummary: null },
      ),
    ).toEqual({ state: 'needs_review', outcome: 'no_tax' });

    expect(
      service.resolveFromDetail(
        createDetail({
          summary: {
            ...createDetail().summary,
            netTaxDue: '9.99',
          },
        }),
        { changeSummary: null },
      ),
    ).toEqual({ state: 'below_threshold', outcome: 'below_threshold' });

    expect(
      service.resolveFromDetail(
        createDetail({
          summary: {
            ...createDetail().summary,
            netTaxDue: '10.00',
          },
        }),
        { changeSummary: null },
      ),
    ).toEqual({ state: 'closed', outcome: 'tax_due' });
  });
});
