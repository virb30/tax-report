import { z } from 'zod';
import type {
  DeleteAllPositionsResult,
  DeletePositionResult,
} from '../../../contracts/delete-position.contract';
import type {
  ImportConsolidatedPositionResult,
  PreviewConsolidatedPositionResult,
} from '../../../contracts/import-consolidated-position.contract';
import type { SetInitialBalanceResult } from '../../../contracts/initial-balance.contract';
import type { ListPositionsResult } from '../../../contracts/list-positions.contract';
import type { MigrateYearResult } from '../../../contracts/migrate-year.contract';
import type { RecalculatePositionResult } from '../../../contracts/recalculate.contract';
import type { AssetType } from '../../../types/domain';
import { defineIpcContract } from '../../define-ipc-contract';

export const listPositionsSchema = z.object({
  baseYear: z
    .number({ message: 'Invalid base year for list positions.' })
    .int('Invalid base year for list positions.'),
});

export const setInitialBalanceSchema = z.object({
  ticker: z
    .string({ message: 'Invalid ticker for initial balance.' })
    .trim()
    .min(1, 'Invalid ticker for initial balance.'),
  brokerId: z
    .string({ message: 'Invalid broker for initial balance.' })
    .trim()
    .min(1, 'Invalid broker for initial balance.'),
  assetType: z
    .any()
    .refine(
      (value) => typeof value === 'string' && ['stock', 'fii', 'etf', 'bdr'].includes(value),
      'Invalid asset type for initial balance.',
    ) as unknown as z.ZodType<AssetType>,
  quantity: z
    .number({ message: 'Invalid quantity for initial balance.' })
    .refine((value) => !Number.isNaN(value), 'Invalid quantity for initial balance.'),
  averagePrice: z
    .number({ message: 'Invalid average price for initial balance.' })
    .refine((value) => !Number.isNaN(value), 'Invalid average price for initial balance.'),
  year: z
    .number({ message: 'Invalid year for initial balance.' })
    .int('Invalid year for initial balance.'),
});

export const recalculatePositionSchema = z.object({
  ticker: z
    .string({ message: 'Invalid ticker for recalculate position.' })
    .trim()
    .min(1, 'Invalid ticker for recalculate position.'),
  year: z
    .number({ message: 'Invalid year for recalculate position.' })
    .int('Invalid year for recalculate position.'),
});

export const migrateYearSchema = z.object({
  sourceYear: z
    .number({ message: 'Invalid source year for migrate year.' })
    .int('Invalid source year for migrate year.'),
  targetYear: z
    .number({ message: 'Invalid target year for migrate year.' })
    .int('Invalid target year for migrate year.'),
});

export const previewConsolidatedPositionSchema = z.object({
  filePath: z
    .string({ message: 'Invalid file path for preview consolidated position.' })
    .trim()
    .min(1, 'Invalid file path for preview consolidated position.'),
});

export const importConsolidatedPositionSchema = z.object({
  filePath: z
    .string({ message: 'Invalid file path for import consolidated position.' })
    .trim()
    .min(1, 'Invalid file path for import consolidated position.'),
  year: z
    .number({ message: 'Invalid year for import consolidated position.' })
    .int('Invalid year for import consolidated position.'),
});

export const deletePositionSchema = z.object({
  ticker: z
    .string({ message: 'Invalid ticker for delete position.' })
    .trim()
    .min(1, 'Invalid ticker for delete position.'),
  year: z
    .number({ message: 'Invalid year for delete position.' })
    .int('Invalid year for delete position.'),
});

export const deleteAllPositionsSchema = z.object({
  year: z
    .number({ message: 'Invalid year for delete all positions.' })
    .int('Invalid year for delete all positions.'),
});

export const setInitialBalanceContract = defineIpcContract<SetInitialBalanceResult>()({
  id: 'portfolio.setInitialBalance',
  channel: 'portfolio:set-initial-balance',
  inputSchema: setInitialBalanceSchema,
  errorMode: 'result',
  exposeToRenderer: true,
  api: { name: 'setInitialBalance' },
  payloadErrorMessage: 'Invalid payload for initial balance.',
});

export const listPositionsContract = defineIpcContract<ListPositionsResult>()({
  id: 'portfolio.listPositions',
  channel: 'portfolio:list-positions',
  inputSchema: listPositionsSchema,
  errorMode: 'result',
  exposeToRenderer: true,
  api: { name: 'listPositions' },
  payloadErrorMessage: 'Invalid payload for list positions.',
});

export const recalculatePositionContract = defineIpcContract<RecalculatePositionResult>()({
  id: 'portfolio.recalculate',
  channel: 'portfolio:recalculate',
  inputSchema: recalculatePositionSchema,
  errorMode: 'result',
  exposeToRenderer: true,
  api: { name: 'recalculatePosition' },
  payloadErrorMessage: 'Invalid payload for recalculate position.',
});

export const migrateYearContract = defineIpcContract<MigrateYearResult>()({
  id: 'portfolio.migrateYear',
  channel: 'portfolio:migrate-year',
  inputSchema: migrateYearSchema,
  errorMode: 'result',
  exposeToRenderer: true,
  api: { name: 'migrateYear' },
  payloadErrorMessage: 'Invalid payload for migrate year.',
});

export const previewConsolidatedPositionContract =
  defineIpcContract<PreviewConsolidatedPositionResult>()({
    id: 'portfolio.previewConsolidatedPosition',
    channel: 'portfolio:preview-consolidated-position',
    inputSchema: previewConsolidatedPositionSchema,
    errorMode: 'result',
    exposeToRenderer: true,
    api: { name: 'previewConsolidatedPosition' },
    payloadErrorMessage: 'Invalid payload for preview consolidated position.',
  });

export const importConsolidatedPositionContract =
  defineIpcContract<ImportConsolidatedPositionResult>()({
    id: 'portfolio.importConsolidatedPosition',
    channel: 'portfolio:import-consolidated-position',
    inputSchema: importConsolidatedPositionSchema,
    errorMode: 'result',
    exposeToRenderer: true,
    api: { name: 'importConsolidatedPosition' },
    payloadErrorMessage: 'Invalid payload for import consolidated position.',
  });

export const deletePositionContract = defineIpcContract<DeletePositionResult>()({
  id: 'portfolio.deletePosition',
  channel: 'portfolio:delete-position',
  inputSchema: deletePositionSchema,
  errorMode: 'result',
  exposeToRenderer: true,
  api: { name: 'deletePosition' },
  payloadErrorMessage: 'Invalid payload for delete position.',
});

export const deleteAllPositionsContract = defineIpcContract<DeleteAllPositionsResult>()({
  id: 'portfolio.deleteAllPositions',
  channel: 'portfolio:delete-all-positions',
  inputSchema: deleteAllPositionsSchema,
  errorMode: 'result',
  exposeToRenderer: true,
  api: { name: 'deleteAllPositions' },
  payloadErrorMessage: 'Invalid payload for delete all positions.',
});

export const portfolioIpcContracts = [
  setInitialBalanceContract,
  listPositionsContract,
  recalculatePositionContract,
  migrateYearContract,
  previewConsolidatedPositionContract,
  importConsolidatedPositionContract,
  deletePositionContract,
  deleteAllPositionsContract,
] as const;
