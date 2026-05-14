import { z } from 'zod';
import { AssetType } from '../../shared/types/domain';
import { HttpValidationError } from '../errors/http-error';

export const booleanQuerySchema = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}, z.boolean().optional());

export const integerFromStringSchema = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return Number(value);
  }

  return value;
}, z.number().int());

export const assetTypeSchema = z.enum(AssetType);
export const averagePriceFeeModeSchema = z.enum(['include', 'ignore']);

export function parseHttpInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  throw new HttpValidationError('Invalid request payload', {
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
}
