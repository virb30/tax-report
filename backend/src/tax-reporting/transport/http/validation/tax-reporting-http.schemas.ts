import { z } from 'zod';
import { integerFromStringSchema } from '../../../../http/validation/http-validation';

export const monthlyTaxHistoryQuerySchema = z.object({
  startYear: integerFromStringSchema.optional(),
});

export const monthlyTaxDetailParamsSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export const monthlyTaxRecalculateBodySchema = z.object({
  startYear: z.number().int().min(1900).max(2100),
  reason: z
    .enum(['bootstrap', 'transactions_changed', 'fees_changed', 'asset_type_changed', 'manual'])
    .default('manual'),
});

export const assetsReportQuerySchema = z.object({
  baseYear: integerFromStringSchema,
});
