export class Money {
  private constructor(private readonly amount: number) {
    this.validate(amount);
  }

  static from(amount: number): Money {
    return new Money(amount);
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount);
  }

  multiplyBy(multiplier: number): Money {
    return new Money(this.amount * multiplier);
  }

  divideBy(divisor: number): Money {
    if (divisor <= 0) {
      throw new Error('Money divisor must be greater than zero.');
    }

    return new Money(this.amount / divisor);
  }

  toNumber(): number {
    return this.amount;
  }

  private validate(amount: number): void {
    if (!Number.isFinite(amount)) {
      throw new Error('Money amount must be finite.');
    }

    if (amount < 0) {
      throw new Error('Money amount cannot be negative.');
    }
  }
}
