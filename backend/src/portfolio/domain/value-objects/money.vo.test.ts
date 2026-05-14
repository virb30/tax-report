import { Money } from './money.vo';

describe('Money', () => {
  describe('creation', () => {
    it('creates from string', () => {
      const money = Money.from('10.50');
      expect(money.getAmount()).toBe('10.5');
    });

    it('creates from number', () => {
      const money = Money.from(10.5);
      expect(money.getAmount()).toBe('10.5');
    });

    it('throws for invalid amount values', () => {
      expect(() => Money.from('invalid')).toThrow('Invalid amount.');
      expect(() => Money.from(Number.NaN)).toThrow('Money amount must be finite.');
      expect(() => Money.from(Number.POSITIVE_INFINITY)).toThrow('Money amount must be finite.');
    });
  });

  describe('arithmetic operations', () => {
    it('supports add, multiply and divide operations', () => {
      const money = Money.from('10').add(Money.from(5)).multiplyBy(2).divideBy(3);
      expect(money.toCurrency()).toBe('10.00');
    });

    it('supports subtract operation', () => {
      const money = Money.from('10').subtract(Money.from('3.5'));
      expect(money.getAmount()).toBe('6.5');
    });

    it('throws when divisor is zero or negative', () => {
      expect(() => Money.from(1).divideBy(0)).toThrow('Divisor must be greater than zero.');
      expect(() => Money.from(1).divideBy(-1)).toThrow('Divisor must be greater than zero.');
    });

    it('ensures immutability', () => {
      const original = Money.from('10');
      original.add(Money.from('5'));
      original.subtract(Money.from('5'));
      original.multiplyBy(2);
      original.divideBy(2);
      expect(original.getAmount()).toBe('10');
    });
  });

  describe('comparison', () => {
    it('checks if less than or equal to', () => {
      const money = Money.from('10');
      expect(money.isLessThanOrEqualTo('10')).toBe(true);
      expect(money.isLessThanOrEqualTo('10.00000001')).toBe(true);
      expect(money.isLessThanOrEqualTo('9.99999999')).toBe(false);
      expect(money.isLessThanOrEqualTo(11)).toBe(true);
      expect(money.isLessThanOrEqualTo(5)).toBe(false);
    });
  });

  describe('formatting', () => {
    it('rounds getAmount to 8 decimal places', () => {
      const money = Money.from('10.123456789');
      expect(money.getAmount()).toBe('10.12345679');
    });

    it('preserves precision in toNumber by default', () => {
      const money = Money.from('10.123456789');
      expect(money.toNumber()).toBe(10.12345679);
    });

    it('formats to currency with 2 decimal places and proper rounding', () => {
      expect(Money.from('10.124').toCurrency()).toBe('10.12');
      expect(Money.from('10.125').toCurrency()).toBe('10.13');
      expect(Money.from('10.1').toCurrency()).toBe('10.10');
      expect(Money.from('10').toCurrency()).toBe('10.00');
    });

    it('rounds and floors to explicit precision', () => {
      expect(Money.from('10.125').roundToCurrency().getAmount()).toBe('10.13');
      expect(Money.from('10.129').floorToCurrency().getAmount()).toBe('10.12');
      expect(Money.minimumCurrencyUnit().getAmount()).toBe('0.01');
      expect(Money.from('10.1234567').roundToDecimalPlaces(6).getAmount()).toBe('10.123457');
      expect(Money.from('10.1234567').floorToDecimalPlaces(6).getAmount()).toBe('10.123456');
      expect(Money.minimumUnit(6).getAmount()).toBe('0.000001');
      expect(Money.from('10.1234567').toRoundedNumber(6)).toBe(10.123457);
    });
  });
});
