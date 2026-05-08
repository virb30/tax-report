import type {
  MonthlyTaxCloseDetail,
  MonthlyTaxCloseRepository,
} from '../repositories/monthly-tax-close.repository';

export interface GetMonthlyTaxDetailInput {
  month: string;
}

export interface GetMonthlyTaxDetailOutput {
  detail: MonthlyTaxCloseDetail | null;
}

export class GetMonthlyTaxDetailUseCase {
  constructor(private readonly monthlyTaxCloseRepository: MonthlyTaxCloseRepository) {}

  async execute(input: GetMonthlyTaxDetailInput): Promise<GetMonthlyTaxDetailOutput> {
    const artifact = await this.monthlyTaxCloseRepository.findDetail(input.month);

    return {
      detail: artifact?.detail ?? null,
    };
  }
}
