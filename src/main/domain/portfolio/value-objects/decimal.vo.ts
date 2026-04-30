import { Decimal } from "decimal.js";

export abstract class DecimalVO {
  public readonly amount: Decimal;


  add(other: Money): Money {
    const result = this.amount.plus(other.amount);
    return new Money(result.toString());
  }

  subtract(other: Money): Money {
    const result = this.amount.minus(other.amount);
    return new Money(result.toString());
  }

  multiplyBy(multiplier: number | string): Money {
    const decimalMultiplier = new Decimal(multiplier);
    const result = this.amount.times(decimalMultiplier);
    return new Money(result.toString());
  }

  divideBy(divisor: number | string): Money {
    const decimalDivisor = new Decimal(divisor);
    if (decimalDivisor.lte(0)) {
      throw new Error('Divisor must be greater than zero.');
    }
    const result = this.amount.dividedBy(decimalDivisor);
    return new Money(result.toString());
  }
}


