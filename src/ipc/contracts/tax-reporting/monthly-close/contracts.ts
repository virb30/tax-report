import { z } from 'zod';
import type {
  MonthlyTaxDetailResult,
  MonthlyTaxHistoryResult,
  RecalculateMonthlyTaxHistoryResult,
} from '../monthly-close.contract';
import { defineIpcContract } from '../../../define-ipc-contract';

const EARLIEST_MONTHLY_TAX_YEAR = 1900;
const LATEST_MONTHLY_TAX_YEAR = 9999;

const startYearSchema = z
  .number({ message: 'Invalid start year for monthly tax recalculation.' })
  .int('Invalid start year for monthly tax recalculation.')
  .min(EARLIEST_MONTHLY_TAX_YEAR, 'Invalid start year for monthly tax recalculation.')
  .max(LATEST_MONTHLY_TAX_YEAR, 'Invalid start year for monthly tax recalculation.');

export const monthlyTaxHistorySchema = z
  .object({
    startYear: startYearSchema.optional(),
  })
  .optional()
  .default({});

export const monthlyTaxDetailSchema = z.object({
  month: z
    .string({ message: 'Invalid month for monthly tax detail.' })
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Invalid month for monthly tax detail.'),
});

export const recalculateMonthlyTaxHistorySchema = z.object({
  startYear: startYearSchema,
  reason: z.literal('manual'),
});

export const monthlyTaxHistoryContract = defineIpcContract<MonthlyTaxHistoryResult>()({
  id: 'report.monthlyTaxHistory',
  channel: 'report:monthly-tax-history',
  inputSchema: monthlyTaxHistorySchema,
  errorMode: 'throw',
  exposeToRenderer: true,
  api: { name: 'listMonthlyTaxHistory' },
  requireObjectInput: false,
  payloadErrorMessage: 'Invalid payload for monthly tax history.',
});

export const monthlyTaxDetailContract = defineIpcContract<MonthlyTaxDetailResult>()({
  id: 'report.monthlyTaxDetail',
  channel: 'report:monthly-tax-detail',
  inputSchema: monthlyTaxDetailSchema,
  errorMode: 'throw',
  exposeToRenderer: true,
  api: { name: 'getMonthlyTaxDetail' },
  payloadErrorMessage: 'Invalid payload for monthly tax detail.',
});

export const recalculateMonthlyTaxHistoryContract =
  defineIpcContract<RecalculateMonthlyTaxHistoryResult>()({
    id: 'report.monthlyTaxRecalculate',
    channel: 'report:monthly-tax-recalculate',
    inputSchema: recalculateMonthlyTaxHistorySchema,
    errorMode: 'throw',
    exposeToRenderer: true,
    api: { name: 'recalculateMonthlyTaxHistory' },
    payloadErrorMessage: 'Invalid payload for monthly tax recalculation.',
  });

export const monthlyCloseIpcContracts = [
  monthlyTaxHistoryContract,
  monthlyTaxDetailContract,
  recalculateMonthlyTaxHistoryContract,
] as const;
