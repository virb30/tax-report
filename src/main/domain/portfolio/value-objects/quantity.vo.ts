import { Decimal } from 'decimal.js';

export class Quantity {
  private readonly amount: Decimal;

  private constructor(amount: number | string) {
    try {
      this.amount = new Decimal(amount);
    } catch {
      throw new Error('Invalid quantity amount.');
    }
    this.validate();
  }

  static from(amount: number | string): Quantity {
    return new Quantity(amount);
  }

  private validate() {
    if (!this.amount.isFinite()) {
      throw new Error('Quantity must be finite.');
    }

    if (this.amount.isNegative()) {
      throw new Error('Quantity cannot be negative.');
    }
  }

  add(other: Quantity): Quantity {
    const result = this.amount.plus(other.amount);
    return new Quantity(result.toString());
  }

  subtract(other: Quantity): Quantity {
    const result = this.amount.minus(other.amount);
    return new Quantity(result.toString());
  }

  multiplyBy(multiplier: number | string): Quantity {
    const decimalMultiplier = new Decimal(multiplier);
    const result = this.amount.times(decimalMultiplier);
    return new Quantity(result.toString());
  }

  divideBy(divisor: number | string): Quantity {
    const decimalDivisor = new Decimal(divisor);
    if (decimalDivisor.lte(0)) {
      throw new Error('Divisor must be greater than zero.');
    }
    const result = this.amount.dividedBy(decimalDivisor);
    return new Quantity(result.toString());
  }

  getAmount(): string {
    return this.amount.toDecimalPlaces(8).toString();
  }

  isLessThanOrEqualTo(other: string | number): boolean {
    const decimalOther = new Decimal(other);
    return this.amount.lte(decimalOther);
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  floor(): Quantity {
    return new Quantity(this.amount.floor().toString());
  }
}
