
import { assertSupportedYear, buildYearOptions, getDefaultBaseYear, YEAR_RANGE } from './year';

describe('year utils', () => {
  it('returns previous calendar year as default base year', () => {
    expect(getDefaultBaseYear(2026)).toBe(2025);
  });

  it('builds default year options around the base year', () => {
    expect(buildYearOptions(2025)).toEqual([
      2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034,
    ]);
  });

  it('builds descending year options when requested', () => {
    expect(buildYearOptions(2025, { yearsBefore: 2, yearsAfter: 0, descending: true })).toEqual([
      2025, 2024, 2023,
    ]);
  });

  it('throws configured messages when year is invalid or out of range', () => {
    expect(() => assertSupportedYear(Number.NaN, { invalidTypeMessage: 'Ano inválido.' })).toThrow(
      'Ano inválido.',
    );
    expect(() =>
      assertSupportedYear(YEAR_RANGE.max + 1, {
        invalidTypeMessage: 'Ano inválido.',
        outOfRangeMessage: 'Ano fora do intervalo.',
      }),
    ).toThrow('Ano fora do intervalo.');
  });
});
