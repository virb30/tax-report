import type {
  MonthlyTaxCloseArtifact,
  MonthlyTaxCloseDetail,
  MonthlyTaxCloseRepository,
} from '../repositories/monthly-tax-close.repository';
import { GetMonthlyTaxDetailUseCase } from './get-monthly-tax-detail.use-case';

function createDetail(): MonthlyTaxCloseDetail {
  return {
    summary: {
      month: '2026-03',
      state: 'closed',
      outcome: 'tax_due',
      grossSales: '32000.00',
      realizedResult: '500.00',
      taxBeforeCredits: '75.00',
      irrfCreditUsed: '0.00',
      netTaxDue: '75.00',
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
  };
}

describe('GetMonthlyTaxDetailUseCase', () => {
  it('returns the full persisted payload for a requested month', async () => {
    const detail = createDetail();
    const monthlyTaxCloseRepository = {
      findDetail: jest.fn().mockResolvedValue({
        month: '2026-03',
        state: 'closed',
        outcome: 'tax_due',
        calculationVersion: 'monthly-tax-v1',
        inputFingerprint: 'fingerprint',
        calculatedAt: '2026-05-07T10:00:00.000Z',
        netTaxDue: '75.00',
        carryForwardOut: '0.00',
        changeSummary: null,
        detail,
      } satisfies MonthlyTaxCloseArtifact),
    } as unknown as jest.Mocked<MonthlyTaxCloseRepository>;
    const useCase = new GetMonthlyTaxDetailUseCase(monthlyTaxCloseRepository);

    const result = await useCase.execute({ month: '2026-03' });

    expect(monthlyTaxCloseRepository.findDetail).toHaveBeenCalledWith('2026-03');
    expect(result.detail).toEqual(detail);
  });
});
