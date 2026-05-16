import { z } from 'zod';
import {
  assetTypeSchema,
  integerFromStringSchema,
} from '../../../../http/validation/http-validation';

const nonEmptyStringSchema = z.string().trim().min(1);
const supportedYearSchema = z.number().int().min(2000).max(2100);
const supportedYearFromStringSchema = integerFromStringSchema.pipe(supportedYearSchema);

const assetTypeOverrideSchema = z.object({
  ticker: nonEmptyStringSchema,
  assetType: assetTypeSchema,
});

function parseJsonField(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  if (value.trim().length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export const dailyBrokerTaxParamsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  brokerId: nonEmptyStringSchema,
});

export const saveDailyBrokerTaxBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  brokerId: nonEmptyStringSchema,
  fees: z.number().nonnegative(),
  irrf: z.number().nonnegative(),
});

export const confirmImportMultipartBodySchema = z.object({
  assetTypeOverrides: z.preprocess(parseJsonField, z.array(assetTypeOverrideSchema).default([])),
});

export const consolidatedImportMultipartBodySchema = z.object({
  year: supportedYearFromStringSchema,
  assetTypeOverrides: z.preprocess(parseJsonField, z.array(assetTypeOverrideSchema).default([])),
});
