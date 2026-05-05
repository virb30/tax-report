import { generateCapitalGainsAssessmentSchema } from './contracts';

describe('tax reporting contracts', () => {
  describe('generateCapitalGainsAssessmentSchema', () => {
    it('accepts a valid base year', () => {
      const result = generateCapitalGainsAssessmentSchema.safeParse({ baseYear: 2025 });
      expect(result.success).toBe(true);
    });

    it('rejects missing baseYear', () => {
      const result = generateCapitalGainsAssessmentSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects non-integer baseYear', () => {
      const result = generateCapitalGainsAssessmentSchema.safeParse({ baseYear: 2025.5 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid base year for capital gains assessment.');
      }
    });

    it('rejects non-number baseYear', () => {
      const result = generateCapitalGainsAssessmentSchema.safeParse({ baseYear: '2025' });
      expect(result.success).toBe(false);
    });
  });
});