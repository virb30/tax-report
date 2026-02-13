export type DarfCalculationInput = {
  taxableProfit: number;
  taxRate: number;
  irrfWithheld: number;
};

export class DarfCalculatorService {
  calculate(input: DarfCalculationInput): number {
    const grossTax = input.taxableProfit * input.taxRate;
    const dueTax = grossTax - input.irrfWithheld;
    if (dueTax < 0) {
      return 0;
    }

    return dueTax;
  }
}
