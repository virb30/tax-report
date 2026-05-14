import type { MonthlyTaxCloseRepository } from '../repositories/monthly-tax-close.repository';
import type { RecalculateMonthlyTaxHistoryUseCase } from './recalculate-monthly-tax-history.use-case';
import { ListMonthlyTaxHistoryUseCase } from './list-monthly-tax-history.use-case';

describe('ListMonthlyTaxHistoryUseCase', () => {
  it('triggers a bootstrap recalculation when no monthly artifacts exist yet', async () => {
    const monthlyTaxCloseRepository = {
      findHistory: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            month: '2026-01',
            state: 'closed',
            outcome: 'no_tax',
            calculationVersion: 'monthly-tax-v1',
            inputFingerprint: 'fingerprint',
            calculatedAt: '2026-05-07T10:00:00.000Z',
            netTaxDue: '0.00',
            carryForwardOut: '0.00',
            changeSummary: null,
          },
        ]),
    } as unknown as jest.Mocked<MonthlyTaxCloseRepository>;
    const recalculateMonthlyTaxHistoryUseCase = {
      execute: jest.fn().mockResolvedValue({
        startMonth: '2026-01',
        endMonth: '2026-01',
        rebuiltMonths: ['2026-01'],
        changedMonthCount: 1,
        recalculatedAt: '2026-05-07T10:00:00.000Z',
      }),
    } as unknown as jest.Mocked<RecalculateMonthlyTaxHistoryUseCase>;
    const useCase = new ListMonthlyTaxHistoryUseCase(
      monthlyTaxCloseRepository,
      recalculateMonthlyTaxHistoryUseCase,
    );

    const result = await useCase.execute({ startYear: 2026 });

    expect(recalculateMonthlyTaxHistoryUseCase.execute).toHaveBeenCalledWith({
      startYear: 2026,
      reason: 'bootstrap',
    });
    expect(monthlyTaxCloseRepository.findHistory).toHaveBeenCalledTimes(2);
    expect(result.months).toHaveLength(1);
  });
});
