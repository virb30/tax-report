export const YEAR_RANGE = {
  min: 2000,
  max: 2100,
} as const;

type SupportedYearValidationMessages = {
  invalidTypeMessage: string;
  outOfRangeMessage?: string;
};

type BuildYearOptionsConfig = {
  yearsBefore?: number;
  yearsAfter?: number;
  descending?: boolean;
};

export function getDefaultBaseYear(currentYear = new Date().getFullYear()): number {
  return currentYear - 1;
}

export function buildYearOptions(baseYear: number, config: BuildYearOptionsConfig = {}): number[] {
  const yearsBefore = config.yearsBefore ?? 5;
  const yearsAfter = config.yearsAfter ?? 9;
  const totalYears = yearsBefore + yearsAfter + 1;
  const years = Array.from({ length: totalYears }, (_, index) => baseYear - yearsBefore + index);

  return config.descending ? years.reverse() : years;
}

export function assertSupportedYear(year: number, messages: SupportedYearValidationMessages): void {
  if (!Number.isInteger(year)) {
    throw new Error(messages.invalidTypeMessage);
  }

  if (year < YEAR_RANGE.min || year > YEAR_RANGE.max) {
    throw new Error(messages.outOfRangeMessage ?? messages.invalidTypeMessage);
  }
}
