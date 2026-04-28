export class Quantity {
  private constructor(private readonly value: number) {
    this.validate(value);
  }

  static from(value: number): Quantity {
    return new Quantity(value);
  }

  add(other: Quantity): Quantity {
    return new Quantity(this.value + other.value);
  }

  subtract(other: Quantity): Quantity {
    const result = this.value - other.value;
    if (result < 0) {
      throw new Error('Quantity cannot be negative.');
    }

    return new Quantity(result);
  }

  toNumber(): number {
    return this.value;
  }

  isZero(): boolean {
    return this.value === 0;
  }

  private validate(value: number): void {
    if (!Number.isFinite(value)) {
      throw new Error('Quantity must be finite.');
    }

    if (value < 0) {
      throw new Error('Quantity cannot be negative.');
    }
  }
}
