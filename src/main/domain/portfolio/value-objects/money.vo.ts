import { Decimal } from 'decimal.js';

const DEFAULT_DECIMAL_PLACES = 8;  

export class Money {
  public readonly amount: Decimal;

  private constructor(amount: number | string) {
    try {
      this.amount = new Decimal(amount);
    } catch {
      throw new Error('Invalid amount.');
    }
    this.validate();
  }

  static from(amount: number | string): Money {
    return new Money(amount);
  }

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

  toCurrency(): string {
    return this.amount.toFixed(2);
  }

  getAmount(): string {
    return this.amount.toDecimalPlaces(DEFAULT_DECIMAL_PLACES).toString();
  }

  isLessThanOrEqualTo(other: string | number): boolean {
    const decimalOther = new Decimal(other);
    return this.amount.lte(decimalOther);
  }

  private validate() {
    if (!this.amount.isFinite()) {
      throw new Error('Money amount must be finite.');
    }
  }
}
