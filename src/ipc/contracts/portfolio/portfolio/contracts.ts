import { z } from 'zod';
import type { DeleteAllPositionsResult, DeletePositionResult } from '../delete-position.contract';
import type {
  ImportConsolidatedPositionResult,
  PreviewConsolidatedPositionResult,
} from '../../ingestion/import-consolidated-position.contract';
import type {
  DeleteInitialBalanceDocumentResult,
  ListInitialBalanceDocumentsResult,
  SaveInitialBalanceDocumentResult,
} from '../initial-balance.contract';
import type { ListPositionsResult } from '../list-positions.contract';
import type { MigrateYearResult } from '../migrate-year.contract';
import type { RecalculatePositionResult } from '../recalculate.contract';
import type { AssetType } from '../../domain';
import { AssetType as AssetTypeEnum } from '../../domain';
import { defineIpcContract } from '../../../define-ipc-contract';

export const listPositionsSchema = z.object({
  baseYear: z
    .number({ message: 'Invalid base year for list positions.' })
    .int('Invalid base year for list positions.'),
});

const initialBalanceAllocationSchema = z.object({
  brokerId: z
    .string({ message: 'Invalid broker for initial balance allocation.' })
    .trim()
    .min(1, 'Invalid broker for initial balance allocation.'),
  quantity: z
    .string({ message: 'Invalid quantity for initial balance allocation.' })
    .trim()
    .refine((value) => {
      const parsed = Number(value);
      return value.length > 0 && !Number.isNaN(parsed) && parsed > 0;
    }, 'Initial balance allocation quantity must be greater than zero.'),
});

const optionalMetadataFieldSchema = z
  .string({ message: 'Invalid optional asset metadata.' })
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  });

export const saveInitialBalanceDocumentSchema = z.object({
  ticker: z
    .string({ message: 'Invalid ticker for initial balance.' })
    .trim()
    .min(1, 'Invalid ticker for initial balance.'),
  assetType: z
    .any()
    .refine(
      (value) => typeof value === 'string' && ['stock', 'fii', 'etf', 'bdr'].includes(value),
      'Invalid asset type for initial balance.',
    ) as unknown as z.ZodType<AssetType>,
  averagePrice: z
    .string({ message: 'Invalid average price for initial balance.' })
    .trim()
    .refine((value) => {
      const parsed = Number(value);
      return value.length > 0 && !Number.isNaN(parsed) && parsed >= 0;
    }, 'Initial balance average price must be zero or greater.'),
  name: optionalMetadataFieldSchema,
  cnpj: optionalMetadataFieldSchema,
  year: z
    .number({ message: 'Invalid year for initial balance.' })
    .int('Invalid year for initial balance.'),
  allocations: z
    .array(initialBalanceAllocationSchema)
    .min(1, 'At least one initial balance allocation is required.'),
});

export const listInitialBalanceDocumentsSchema = z.object({
  year: z
    .number({ message: 'Invalid year for list initial balance documents.' })
    .int('Invalid year for list initial balance documents.'),
});

export const deleteInitialBalanceDocumentSchema = z.object({
  ticker: z
    .string({ message: 'Invalid ticker for delete initial balance document.' })
    .trim()
    .min(1, 'Invalid ticker for delete initial balance document.'),
  year: z
    .number({ message: 'Invalid year for delete initial balance document.' })
    .int('Invalid year for delete initial balance document.'),
});

export const recalculatePositionSchema = z.object({
  ticker: z
    .string({ message: 'Invalid ticker for recalculate position.' })
    .trim()
    .min(1, 'Invalid ticker for recalculate position.'),
  year: z
    .number({ message: 'Invalid year for recalculate position.' })
    .int('Invalid year for recalculate position.'),
  averagePriceFeeMode: z.enum(['include', 'ignore']).optional(),
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
  assetTypeOverrides: z.array(
    z.object({
      ticker: z
        .string({ message: 'Invalid ticker for consolidated import asset type override.' })
        .trim()
        .min(1, 'Invalid ticker for consolidated import asset type override.'),
      assetType: z.nativeEnum(AssetTypeEnum, {
        message: 'Invalid asset type for consolidated import asset type override.',
      }),
    }),
  ),
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

export const saveInitialBalanceDocumentContract =
  defineIpcContract<SaveInitialBalanceDocumentResult>()({
    id: 'portfolio.saveInitialBalanceDocument',
    channel: 'portfolio:save-initial-balance-document',
    inputSchema: saveInitialBalanceDocumentSchema,
    errorMode: 'result',
    exposeToRenderer: true,
    api: { name: 'saveInitialBalanceDocument' },
    payloadErrorMessage: 'Invalid payload for save initial balance document.',
  });

export const listInitialBalanceDocumentsContract =
  defineIpcContract<ListInitialBalanceDocumentsResult>()({
    id: 'portfolio.listInitialBalanceDocuments',
    channel: 'portfolio:list-initial-balance-documents',
    inputSchema: listInitialBalanceDocumentsSchema,
    errorMode: 'result',
    exposeToRenderer: true,
    api: { name: 'listInitialBalanceDocuments' },
    payloadErrorMessage: 'Invalid payload for list initial balance documents.',
  });

export const deleteInitialBalanceDocumentContract =
  defineIpcContract<DeleteInitialBalanceDocumentResult>()({
    id: 'portfolio.deleteInitialBalanceDocument',
    channel: 'portfolio:delete-initial-balance-document',
    inputSchema: deleteInitialBalanceDocumentSchema,
    errorMode: 'result',
    exposeToRenderer: true,
    api: { name: 'deleteInitialBalanceDocument' },
    payloadErrorMessage: 'Invalid payload for delete initial balance document.',
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
  saveInitialBalanceDocumentContract,
  listInitialBalanceDocumentsContract,
  deleteInitialBalanceDocumentContract,
  listPositionsContract,
  recalculatePositionContract,
  migrateYearContract,
  previewConsolidatedPositionContract,
  importConsolidatedPositionContract,
  deletePositionContract,
  deleteAllPositionsContract,
] as const;
