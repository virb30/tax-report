import { describe, expect, it } from '@jest/globals';
import { DarfCalculatorService } from './darf-calculator-service';

describe('DarfCalculatorService', () => {
  it('calculates due tax after IRRF deduction', () => {
    const service = new DarfCalculatorService();

    const result = service.calculate({
      taxableProfit: 1000,
      taxRate: 0.15,
      irrfWithheld: 10,
    });

    expect(result).toBe(140);
  });

  it('returns zero when IRRF is greater than gross tax', () => {
    const service = new DarfCalculatorService();

    const result = service.calculate({
      taxableProfit: 100,
      taxRate: 0.15,
      irrfWithheld: 50,
    });

    expect(result).toBe(0);
  });
});
