import {
  monthlyCloseIpcContracts,
  monthlyTaxDetailContract,
  monthlyTaxDetailSchema,
  monthlyTaxHistoryContract,
  monthlyTaxHistorySchema,
  recalculateMonthlyTaxHistoryContract,
  recalculateMonthlyTaxHistorySchema,
} from './contracts';

describe('monthly close contracts', () => {
  it('preserves monthly close public contract metadata', () => {
    expect(monthlyCloseIpcContracts).toEqual([
      monthlyTaxHistoryContract,
      monthlyTaxDetailContract,
      recalculateMonthlyTaxHistoryContract,
    ]);
    expect(
      monthlyCloseIpcContracts.map((contract) => ({
        id: contract.id,
        channel: contract.channel,
        errorMode: contract.errorMode,
        exposeToRenderer: contract.exposeToRenderer,
        apiName: contract.api?.name,
      })),
    ).toEqual([
      {
        id: 'report.monthlyTaxHistory',
        channel: 'report:monthly-tax-history',
        errorMode: 'throw',
        exposeToRenderer: true,
        apiName: 'listMonthlyTaxHistory',
      },
      {
        id: 'report.monthlyTaxDetail',
        channel: 'report:monthly-tax-detail',
        errorMode: 'throw',
        exposeToRenderer: true,
        apiName: 'getMonthlyTaxDetail',
      },
      {
        id: 'report.monthlyTaxRecalculate',
        channel: 'report:monthly-tax-recalculate',
        errorMode: 'throw',
        exposeToRenderer: true,
        apiName: 'recalculateMonthlyTaxHistory',
      },
    ]);
  });

  it('validates monthly close query and command payloads', () => {
    expect(monthlyTaxHistorySchema.parse(undefined)).toEqual({});
    expect(monthlyTaxHistorySchema.parse({ startYear: 2026 })).toEqual({ startYear: 2026 });
    expect(monthlyTaxDetailSchema.parse({ month: '2026-05' })).toEqual({ month: '2026-05' });
    expect(recalculateMonthlyTaxHistorySchema.parse({ startYear: 2026, reason: 'manual' })).toEqual(
      {
        startYear: 2026,
        reason: 'manual',
      },
    );
  });

  it('rejects invalid month and startYear payloads', () => {
    expect(() => monthlyTaxDetailSchema.parse({ month: '2026-13' })).toThrow();
    expect(() => monthlyTaxDetailSchema.parse({ month: '202605' })).toThrow();
    expect(() =>
      recalculateMonthlyTaxHistorySchema.parse({ startYear: 2026.5, reason: 'manual' }),
    ).toThrow();
    expect(() =>
      recalculateMonthlyTaxHistorySchema.parse({ startYear: 1899, reason: 'manual' }),
    ).toThrow();
    expect(() => monthlyTaxHistorySchema.parse({ startYear: 2026.5 })).toThrow();
    expect(() =>
      recalculateMonthlyTaxHistorySchema.parse({
        startYear: 2026,
        reason: 'transactions_changed',
      }),
    ).toThrow();
  });
});
