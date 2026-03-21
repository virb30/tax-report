import { z } from 'zod';
import { IpcController } from './ipc-controller.interface';
import { SetInitialBalanceUseCase } from '../../application/use-cases/set-initial-balance/set-initial-balance.use-case';
import { ListPositionsUseCase } from '../../application/use-cases/list-positions/list-positions-use-case';
import { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position/recalculate-position.use-case';
import { MigrateYearUseCase } from '../../application/use-cases/migrate-year/migrate-year.use-case';
import { ImportConsolidatedPositionUseCase } from '../../application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import { DeletePositionUseCase } from '../../application/use-cases/delete-position/delete-position.use-case';
import type { AssetType } from '../../../shared/types/domain';

function parseWith<T>(schema: z.ZodType<T>, input: unknown, payloadErrorMessage: string): T {
  if (!input || typeof input !== 'object') {
    throw new Error(payloadErrorMessage);
  }
  try {
    return schema.parse(input);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const message = err.issues?.[0]?.message || err.message;
      throw new Error(message);
    }
    throw err;
  }
}

const listPositionsSchema = z.object({
  baseYear: z.number({ message: 'Invalid base year for list positions.' }).int('Invalid base year for list positions.'),
});

const setInitialBalanceSchema = z.object({
  ticker: z.string({ message: 'Invalid ticker for initial balance.' }).trim().min(1, 'Invalid ticker for initial balance.'),
  brokerId: z.string({ message: 'Invalid broker for initial balance.' }).trim().min(1, 'Invalid broker for initial balance.'),
  assetType: z.any().refine((val) => typeof val === 'string' && ['stock', 'fii', 'etf', 'bdr'].includes(val), 'Invalid asset type for initial balance.') as unknown as z.ZodType<AssetType>,
  quantity: z.number({ message: 'Invalid quantity for initial balance.' }).refine(val => !Number.isNaN(val), 'Invalid quantity for initial balance.'),
  averagePrice: z.number({ message: 'Invalid average price for initial balance.' }).refine(val => !Number.isNaN(val), 'Invalid average price for initial balance.'),
  year: z.number({ message: 'Invalid year for initial balance.' }).int('Invalid year for initial balance.'),
});

const recalculatePositionSchema = z.object({
  ticker: z.string({ message: 'Invalid ticker for recalculate position.' }).trim().min(1, 'Invalid ticker for recalculate position.'),
  year: z.number({ message: 'Invalid year for recalculate position.' }).int('Invalid year for recalculate position.'),
});

const migrateYearSchema = z.object({
  sourceYear: z.number({ message: 'Invalid source year for migrate year.' }).int('Invalid source year for migrate year.'),
  targetYear: z.number({ message: 'Invalid target year for migrate year.' }).int('Invalid target year for migrate year.'),
});

const previewConsolidatedPositionSchema = z.object({
  filePath: z.string({ message: 'Invalid file path for preview consolidated position.' }).trim().min(1, 'Invalid file path for preview consolidated position.'),
});

const importConsolidatedPositionSchema = z.object({
  filePath: z.string({ message: 'Invalid file path for import consolidated position.' }).trim().min(1, 'Invalid file path for import consolidated position.'),
  year: z.number({ message: 'Invalid year for import consolidated position.' }).int('Invalid year for import consolidated position.'),
});

const deletePositionSchema = z.object({
  ticker: z.string({ message: 'Invalid ticker for delete position.' }).trim().min(1, 'Invalid ticker for delete position.'),
  year: z.number({ message: 'Invalid year for delete position.' }).int('Invalid year for delete position.'),
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

    ipcMain.handle('portfolio:set-initial-balance', async (_event, input: unknown) => {
      const payload = parseWith(setInitialBalanceSchema, input, 'Invalid payload for initial balance.');
      return this.setInitialBalanceUseCase.execute(payload);
    });

    ipcMain.handle('portfolio:list-positions', async (_event, input: unknown) => {
      const payload = parseWith(listPositionsSchema, input, 'Invalid payload for list positions.');
      return this.listPositionsUseCase.execute(payload);
    });

    ipcMain.handle('portfolio:recalculate', async (_event, input: unknown) => {
      const payload = parseWith(recalculatePositionSchema, input, 'Invalid payload for recalculate position.');
      return this.recalculatePositionUseCase.execute(payload);
    });

    ipcMain.handle('portfolio:migrate-year', async (_event, input: unknown) => {
      const payload = parseWith(migrateYearSchema, input, 'Invalid payload for migrate year.');
      return this.migrateYearUseCase.execute(payload);
    });

    ipcMain.handle('portfolio:preview-consolidated-position', async (_event, input: unknown) => {
      const payload = parseWith(previewConsolidatedPositionSchema, input, 'Invalid payload for preview consolidated position.');
      return this.importConsolidatedPositionUseCase.preview(payload);
    });

    ipcMain.handle('portfolio:import-consolidated-position', async (_event, input: unknown) => {
      const payload = parseWith(importConsolidatedPositionSchema, input, 'Invalid payload for import consolidated position.');
      return this.importConsolidatedPositionUseCase.execute(payload);
    });

    ipcMain.handle('portfolio:delete-position', async (_event, input: unknown) => {
      const payload = parseWith(deletePositionSchema, input, 'Invalid payload for delete position.');
      return this.deletePositionUseCase.execute(payload);
    });

    return channels;
  }
}
