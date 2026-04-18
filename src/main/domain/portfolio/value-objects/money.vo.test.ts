import { describe, expect, it } from '@jest/globals';
import { Money } from './money.vo';

describe('Money', () => {
  it('supports add, multiply and divide operations', () => {
    const amount = Money.from(10).add(Money.from(5)).multiplyBy(2).divideBy(3);
    expect(amount.toNumber()).toBe(10);
  });

  it('throws for invalid amount values', () => {
    expect(() => Money.from(Number.NaN)).toThrow('Money amount must be finite.');
    expect(() => Money.from(-1)).toThrow('Money amount cannot be negative.');
  });

  it('throws when divisor is zero or negative', () => {
    expect(() => Money.from(1).divideBy(0)).toThrow('Money divisor must be greater than zero.');
    expect(() => Money.from(1).divideBy(-1)).toThrow('Money divisor must be greater than zero.');
  });
});
