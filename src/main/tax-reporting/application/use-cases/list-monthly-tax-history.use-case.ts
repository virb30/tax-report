import type {
  MonthlyTaxCloseRepository,
  MonthlyTaxCloseSummary,
} from '../repositories/monthly-tax-close.repository';
import type { RecalculateMonthlyTaxHistoryUseCase } from './recalculate-monthly-tax-history.use-case';

export interface ListMonthlyTaxHistoryInput {
  startYear?: number;
}

export interface ListMonthlyTaxHistoryOutput {
  months: MonthlyTaxCloseSummary[];
}

const DEFAULT_BOOTSTRAP_START_YEAR = 1900;

export class ListMonthlyTaxHistoryUseCase {
  constructor(
    private readonly monthlyTaxCloseRepository: MonthlyTaxCloseRepository,
    private readonly recalculateMonthlyTaxHistoryUseCase: RecalculateMonthlyTaxHistoryUseCase,
  ) {}

  async execute(input: ListMonthlyTaxHistoryInput = {}): Promise<ListMonthlyTaxHistoryOutput> {
    const history = await this.monthlyTaxCloseRepository.findHistory();

    if (history.length > 0) {
      return { months: history };
    }

    await this.recalculateMonthlyTaxHistoryUseCase.execute({
      startYear: input.startYear ?? DEFAULT_BOOTSTRAP_START_YEAR,
      reason: 'bootstrap',
    });

    return {
      months: await this.monthlyTaxCloseRepository.findHistory(),
    };
  }
}
