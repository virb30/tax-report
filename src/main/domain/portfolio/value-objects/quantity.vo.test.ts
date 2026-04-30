
import { Quantity } from './quantity.vo';

describe('Quantity', () => {
  describe('creation', () => {
    it('creates from string', () => {
      const quantity = Quantity.from('10.50');
      expect(quantity.getAmount()).toBe('10.5');
    });

    it('creates from number', () => {
      const quantity = Quantity.from(10.5);
      expect(quantity.getAmount()).toBe('10.5');
    });

    it('throws for invalid quantity values', () => {
      expect(() => Quantity.from('invalid')).toThrow('Invalid quantity amount.');
      expect(() => Quantity.from(Number.NaN)).toThrow('Quantity must be finite.');
      expect(() => Quantity.from(Number.POSITIVE_INFINITY)).toThrow('Quantity must be finite.');
      expect(() => Quantity.from(-1)).toThrow('Quantity cannot be negative.');
    });
  });

  describe('arithmetic operations', () => {
    it('supports add, subtract and zero checks', () => {
      const zeroQuantity = Quantity.from(0);
      expect(zeroQuantity.isZero()).toBe(true);

      const amount = Quantity.from(5).add(Quantity.from(2)).subtract(Quantity.from(3));
      expect(amount.getAmount()).toBe('4');
      expect(amount.isZero()).toBe(false);
    });

    it('supports multiply and divide operations', () => {
      const quantity = Quantity.from('10').multiplyBy(2).divideBy(4);
      expect(quantity.getAmount()).toBe('5');
    });

    it('throws when subtracting to a negative quantity', () => {
      expect(() => Quantity.from(1).subtract(Quantity.from(2))).toThrow('Quantity cannot be negative.');
    });

    it('throws when divisor is zero or negative', () => {
      expect(() => Quantity.from(1).divideBy(0)).toThrow('Divisor must be greater than zero.');
      expect(() => Quantity.from(1).divideBy(-1)).toThrow('Divisor must be greater than zero.');
    });

    it('throws when multiplication results in negative quantity', () => {
      expect(() => Quantity.from(10).multiplyBy(-1)).toThrow('Quantity cannot be negative.');
    });

    it('ensures immutability', () => {
      const original = Quantity.from('10');
      original.add(Quantity.from('5'));
      original.subtract(Quantity.from('5'));
      original.multiplyBy(2);
      original.divideBy(2);
      expect(original.getAmount()).toBe('10');
    });
  });

  describe('comparison', () => {
    it('checks if less than or equal to', () => {
      const quantity = Quantity.from('10');
      expect(quantity.isLessThanOrEqualTo('10')).toBe(true);
      expect(quantity.isLessThanOrEqualTo('10.00000001')).toBe(true);
      expect(quantity.isLessThanOrEqualTo('9.99999999')).toBe(false);
      expect(quantity.isLessThanOrEqualTo(11)).toBe(true);
      expect(quantity.isLessThanOrEqualTo(5)).toBe(false);
    });
  });

  describe('formatting', () => {
    it('rounds getAmount to 8 decimal places', () => {
      const quantity = Quantity.from('10.123456789');
      expect(quantity.getAmount()).toBe('10.12345679');
    });
  });
});
