import { z } from 'zod';
import type { IpcController } from './ipc-controller.interface';
import type { SetInitialBalanceUseCase } from '../../application/use-cases/set-initial-balance/set-initial-balance.use-case';
import type { ListPositionsUseCase } from '../../application/use-cases/list-positions/list-positions-use-case';
import type { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position/recalculate-position.use-case';
import type { MigrateYearUseCase } from '../../application/use-cases/migrate-year/migrate-year.use-case';
import type { ImportConsolidatedPositionUseCase } from '../../application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import type { DeletePositionUseCase } from '../../application/use-cases/delete-position/delete-position.use-case';
import type { AssetType } from '../../../shared/types/domain';
import { registerValidatedHandler } from './ipc-handler.utils';

const listPositionsSchema = z.object({
  baseYear: z
    .number({ message: 'Invalid base year for list positions.' })
    .int('Invalid base year for list positions.'),
});

const setInitialBalanceSchema = z.object({
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
      (val) => typeof val === 'string' && ['stock', 'fii', 'etf', 'bdr'].includes(val),
      'Invalid asset type for initial balance.',
    ) as unknown as z.ZodType<AssetType>,
  quantity: z
    .number({ message: 'Invalid quantity for initial balance.' })
    .refine((val) => !Number.isNaN(val), 'Invalid quantity for initial balance.'),
  averagePrice: z
    .number({ message: 'Invalid average price for initial balance.' })
    .refine((val) => !Number.isNaN(val), 'Invalid average price for initial balance.'),
  year: z
    .number({ message: 'Invalid year for initial balance.' })
    .int('Invalid year for initial balance.'),
});

const recalculatePositionSchema = z.object({
  ticker: z
    .string({ message: 'Invalid ticker for recalculate position.' })
    .trim()
    .min(1, 'Invalid ticker for recalculate position.'),
  year: z
    .number({ message: 'Invalid year for recalculate position.' })
    .int('Invalid year for recalculate position.'),
});

const migrateYearSchema = z.object({
  sourceYear: z
    .number({ message: 'Invalid source year for migrate year.' })
    .int('Invalid source year for migrate year.'),
  targetYear: z
    .number({ message: 'Invalid target year for migrate year.' })
    .int('Invalid target year for migrate year.'),
});

const previewConsolidatedPositionSchema = z.object({
  filePath: z
    .string({ message: 'Invalid file path for preview consolidated position.' })
    .trim()
    .min(1, 'Invalid file path for preview consolidated position.'),
});

const importConsolidatedPositionSchema = z.object({
  filePath: z
    .string({ message: 'Invalid file path for import consolidated position.' })
    .trim()
    .min(1, 'Invalid file path for import consolidated position.'),
  year: z
    .number({ message: 'Invalid year for import consolidated position.' })
    .int('Invalid year for import consolidated position.'),
});

const deletePositionSchema = z.object({
  ticker: z
    .string({ message: 'Invalid ticker for delete position.' })
    .trim()
    .min(1, 'Invalid ticker for delete position.'),
  year: z
    .number({ message: 'Invalid year for delete position.' })
    .int('Invalid year for delete position.'),
});

export class PortfolioController implements IpcController {
  constructor(
    private readonly setInitialBalanceUseCase: SetInitialBalanceUseCase,
    private readonly listPositionsUseCase: ListPositionsUseCase,
    private readonly recalculatePositionUseCase: RecalculatePositionUseCase,
    private readonly migrateYearUseCase: MigrateYearUseCase,
    private readonly importConsolidatedPositionUseCase: ImportConsolidatedPositionUseCase,
    private readonly deletePositionUseCase: DeletePositionUseCase,
  ) {}

  register(ipcMain: Electron.IpcMain): string[] {
    const channels = [
      'portfolio:set-initial-balance',
      'portfolio:list-positions',
      'portfolio:recalculate',
      'portfolio:migrate-year',
      'portfolio:preview-consolidated-position',
      'portfolio:import-consolidated-position',
      'portfolio:delete-position',
    ];

    registerValidatedHandler(ipcMain, {
      channel: 'portfolio:set-initial-balance',
      schema: setInitialBalanceSchema,
      payloadErrorMessage: 'Invalid payload for initial balance.',
      execute: (payload) => this.setInitialBalanceUseCase.execute(payload),
    });

    registerValidatedHandler(ipcMain, {
      channel: 'portfolio:list-positions',
      schema: listPositionsSchema,
      payloadErrorMessage: 'Invalid payload for list positions.',
      execute: (payload) => this.listPositionsUseCase.execute(payload),
    });

    registerValidatedHandler(ipcMain, {
      channel: 'portfolio:recalculate',
      schema: recalculatePositionSchema,
      payloadErrorMessage: 'Invalid payload for recalculate position.',
      execute: (payload) => this.recalculatePositionUseCase.execute(payload),
    });

    registerValidatedHandler(ipcMain, {
      channel: 'portfolio:migrate-year',
      schema: migrateYearSchema,
      payloadErrorMessage: 'Invalid payload for migrate year.',
      execute: (payload) => this.migrateYearUseCase.execute(payload),
    });

    registerValidatedHandler(ipcMain, {
      channel: 'portfolio:preview-consolidated-position',
      schema: previewConsolidatedPositionSchema,
      payloadErrorMessage: 'Invalid payload for preview consolidated position.',
      execute: (payload) => this.importConsolidatedPositionUseCase.preview(payload),
    });

    registerValidatedHandler(ipcMain, {
      channel: 'portfolio:import-consolidated-position',
      schema: importConsolidatedPositionSchema,
      payloadErrorMessage: 'Invalid payload for import consolidated position.',
      execute: (payload) => this.importConsolidatedPositionUseCase.execute(payload),
    });

    registerValidatedHandler(ipcMain, {
      channel: 'portfolio:delete-position',
      schema: deletePositionSchema,
      payloadErrorMessage: 'Invalid payload for delete position.',
      execute: (payload) => this.deletePositionUseCase.execute(payload),
    });

    return channels;
  }
}
