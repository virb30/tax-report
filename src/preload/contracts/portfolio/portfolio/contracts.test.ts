import { recalculatePositionSchema } from './contracts';

describe('portfolio contracts', () => {
  describe('recalculatePositionSchema', () => {
    it('accepts legacy payloads without average price fee mode', () => {
      expect(
        recalculatePositionSchema.parse({
          ticker: 'PETR4',
          year: 2025,
        }),
      ).toEqual({
        ticker: 'PETR4',
        year: 2025,
      });
    });

    it('accepts the average price fee mode values', () => {
      expect(
        recalculatePositionSchema.parse({
          ticker: 'PETR4',
          year: 2025,
          averagePriceFeeMode: 'include',
        }),
      ).toEqual({
        ticker: 'PETR4',
        year: 2025,
        averagePriceFeeMode: 'include',
      });
      expect(
        recalculatePositionSchema.parse({
          ticker: 'PETR4',
          year: 2025,
          averagePriceFeeMode: 'ignore',
        }),
      ).toEqual({
        ticker: 'PETR4',
        year: 2025,
        averagePriceFeeMode: 'ignore',
      });
    });
  });
});
