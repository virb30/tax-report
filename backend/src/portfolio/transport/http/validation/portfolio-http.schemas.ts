import { z } from 'zod';
import {
  assetTypeSchema,
  averagePriceFeeModeSchema,
  booleanQuerySchema,
  integerFromStringSchema,
} from '../../../../http/validation/http-validation';

const nonEmptyStringSchema = z.string().trim().min(1);
const moneyLikeSchema = z.union([z.string().trim().min(1), z.number().nonnegative()]);
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

export const brokerListQuerySchema = z.object({
  activeOnly: booleanQuerySchema,
});

export const brokerCreateBodySchema = z.object({
  name: nonEmptyStringSchema,
  cnpj: nonEmptyStringSchema,
  code: nonEmptyStringSchema,
});

export const brokerUpdateParamsSchema = z.object({
  id: nonEmptyStringSchema,
});

export const brokerUpdateBodySchema = z
  .object({
    name: nonEmptyStringSchema.optional(),
    cnpj: nonEmptyStringSchema.optional(),
    code: nonEmptyStringSchema.optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.cnpj !== undefined || value.code !== undefined,
    {
      message: 'At least one editable broker field is required',
    },
  );

export const assetListQuerySchema = z.object({
  pendingOnly: booleanQuerySchema,
  reportBlockingOnly: booleanQuerySchema,
});

export const assetParamsSchema = z.object({
  ticker: nonEmptyStringSchema,
});

export const assetUpdateBodySchema = z
  .object({
    assetType: assetTypeSchema.optional(),
    name: nonEmptyStringSchema.optional(),
    cnpj: nonEmptyStringSchema.optional(),
  })
  .refine(
    (value) =>
      value.assetType !== undefined || value.name !== undefined || value.cnpj !== undefined,
    {
      message: 'At least one editable asset field is required',
    },
  );

export const repairAssetTypeBodySchema = z.object({
  assetType: assetTypeSchema,
});

export const yearQuerySchema = z.object({
  year: supportedYearFromStringSchema,
});

export const initialBalanceParamsSchema = z.object({
  year: supportedYearFromStringSchema,
  ticker: nonEmptyStringSchema,
});

export const saveInitialBalanceBodySchema = z.object({
  ticker: nonEmptyStringSchema,
  year: supportedYearSchema,
  assetType: assetTypeSchema,
  name: nonEmptyStringSchema.optional(),
  cnpj: nonEmptyStringSchema.optional(),
  averagePrice: moneyLikeSchema.transform((value) => String(value)),
  allocations: z
    .array(
      z.object({
        brokerId: nonEmptyStringSchema,
        quantity: moneyLikeSchema.transform((value) => String(value)),
      }),
    )
    .min(1),
});

export const positionsQuerySchema = z.object({
  year: supportedYearFromStringSchema,
  ticker: nonEmptyStringSchema.optional(),
});

export const positionParamsSchema = z.object({
  ticker: nonEmptyStringSchema,
});

export const recalculatePositionBodySchema = z.object({
  ticker: nonEmptyStringSchema,
  year: supportedYearSchema,
  assetType: assetTypeSchema.optional(),
  averagePriceFeeMode: averagePriceFeeModeSchema.optional(),
});

export const migrateYearBodySchema = z.object({
  sourceYear: supportedYearSchema,
  targetYear: supportedYearSchema,
});

export const consolidatedImportMultipartBodySchema = z.object({
  year: supportedYearFromStringSchema,
  assetTypeOverrides: z.preprocess(parseJsonField, z.array(assetTypeOverrideSchema).default([])),
});
