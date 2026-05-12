import { Decimal } from 'decimal.js';

const DEFAULT_DECIMAL_PLACES = 8;
const CURRENCY_DECIMAL_PLACES = 2;

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
    return this.toFixed(CURRENCY_DECIMAL_PLACES);
  }

  getAmount(): string {
    return this.amount.toDecimalPlaces(DEFAULT_DECIMAL_PLACES).toString();
  }

  toNumber(): number {
    return Number(this.getAmount());
  }

  toRoundedNumber(decimalPlaces: number): number {
    return Number(this.toFixed(decimalPlaces));
  }

  floorToCurrency(): Money {
    return this.floorToDecimalPlaces(CURRENCY_DECIMAL_PLACES);
  }

  roundToCurrency(): Money {
    return this.roundToDecimalPlaces(CURRENCY_DECIMAL_PLACES);
  }

  static minimumCurrencyUnit(): Money {
    return Money.minimumUnit(CURRENCY_DECIMAL_PLACES);
  }

  roundToDecimalPlaces(decimalPlaces: number): Money {
    const result = this.amount.toDecimalPlaces(decimalPlaces);
    return new Money(result.toString());
  }

  floorToDecimalPlaces(decimalPlaces: number): Money {
    const result = this.amount.toDecimalPlaces(decimalPlaces, Decimal.ROUND_FLOOR);
    return new Money(result.toString());
  }

  toFixed(decimalPlaces: number): string {
    return this.amount.toFixed(decimalPlaces);
  }

  static minimumUnit(decimalPlaces: number): Money {
    return new Money(new Decimal(1).dividedBy(new Decimal(10).pow(decimalPlaces)).toString());
  }

  isLessThanOrEqualTo(other: Money | string | number): boolean {
    const decimalOther = this.toComparableDecimal(other);
    return this.amount.lte(decimalOther);
  }

  isGreaterThanOrEqualTo(other: Money | string | number): boolean {
    const decimalOther = this.toComparableDecimal(other);
    return this.amount.gte(decimalOther);
  }

  isGreaterThan(other: Money | string | number): boolean {
    const decimalOther = this.toComparableDecimal(other);
    return this.amount.gt(decimalOther);
  }

  isNegative(): boolean {
    return this.amount.isNegative();
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  private validate() {
    if (!this.amount.isFinite()) {
      throw new Error('Money amount must be finite.');
    }
  }

  private toComparableDecimal(other: Money | string | number): Decimal {
    if (other instanceof Money) {
      return other.amount;
    }

    return new Decimal(other);
  }
}
