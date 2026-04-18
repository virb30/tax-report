import { describe, expect, it } from '@jest/globals';
import { Quantity } from './quantity.vo';

describe('Quantity', () => {
  it('supports add, subtract and zero checks', () => {
    const zeroQuantity = Quantity.from(0);
    expect(zeroQuantity.isZero()).toBe(true);

    const amount = Quantity.from(5).add(Quantity.from(2)).subtract(Quantity.from(3));
    expect(amount.toNumber()).toBe(4);
    expect(amount.isZero()).toBe(false);
  });

  it('throws for invalid quantity values', () => {
    expect(() => Quantity.from(Number.NaN)).toThrow('Quantity must be finite.');
    expect(() => Quantity.from(1.5)).toThrow('Quantity must be an integer.');
    expect(() => Quantity.from(-1)).toThrow('Quantity cannot be negative.');
  });

  it('throws when subtracting to a negative quantity', () => {
    expect(() => Quantity.from(1).subtract(Quantity.from(2))).toThrow('Quantity cannot be negative.');
  });
});
