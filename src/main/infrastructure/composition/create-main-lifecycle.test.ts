import { describe, expect, it, jest } from '@jest/globals';
import { AssetType } from '../../../shared/types/domain';
import { createMainLifecycle, type CreateMainLifecycleDependencies } from './create-main-lifecycle';

describe('createMainLifecycle', () => {
  function createMainHandlersDependencies(): CreateMainLifecycleDependencies['mainHandlersDependencies'] {
    return {
      checkHealth: () => ({ status: 'ok' }),
      importSelectFile: () => Promise.resolve({ filePath: null }),
      previewImportTransactions: () =>
        Promise.resolve({ batches: [], transactionsPreview: [] }),
      confirmImportTransactions: () =>
        Promise.resolve({ importedCount: 1, recalculatedTickers: ['PETR4'] }),
      setInitialBalance: () =>
        Promise.resolve({
          ticker: 'PETR4',
          brokerId: 'broker-xp',
          quantity: 1,
          averagePrice: 10,
        }),
      listPositions: () => Promise.resolve({ items: [] }),
      generateAssetsReport: (): Promise<any> =>
        Promise.resolve({
        referenceDate: '2025-12-31',
        items: [
          {
            ticker: 'PETR4',
            broker: 'XP',
            assetType: AssetType.Stock,
            quantity: 1,
            averagePrice: 10,
            totalCost: 10,
            revenueClassification: { group: '03', code: '01' },
            description: 'desc',
          },
        ],
        }),
      recalculatePosition: (): Promise<any> => Promise.resolve(),
      migrateYear: (): Promise<any> =>
        Promise.resolve({
          migratedPositionsCount: 0,
          createdTransactionsCount: 0,
        }),
      previewConsolidatedPosition: (): Promise<any> => Promise.resolve({ rows: [] }),
      importConsolidatedPosition: (): Promise<any> => Promise.resolve({ importedCount: 0, recalculatedTickers: [] }),
      deletePosition: (): Promise<any> => Promise.resolve({ deleted: true }),
    };
  }

  it('creates lifecycle and registers IPC handlers', () => {
    const app: CreateMainLifecycleDependencies['app'] = {
      on: jest.fn() as unknown as CreateMainLifecycleDependencies['app']['on'],
      whenReady: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      quit: jest.fn(),
    };
    const browserWindow: CreateMainLifecycleDependencies['browserWindow'] = {
      getAllWindows: jest.fn<() => unknown[]>().mockReturnValue([]),
    };
    const ipcHandleMock = jest.fn();
    const ipcMain: CreateMainLifecycleDependencies['ipcMain'] = {
      handle:
        ipcHandleMock as unknown as CreateMainLifecycleDependencies['ipcMain']['handle'],
    };
    const createMainWindow = jest.fn();

    const lifecycle = createMainLifecycle({
      app,
      browserWindow,
      ipcMain,
      mainHandlersDependencies: createMainHandlersDependencies(),
      platform: 'linux',
      createMainWindow,
    });

    expect(lifecycle).toBeDefined();
    expect(ipcHandleMock).toHaveBeenCalledWith('app:health-check', expect.any(Function));
    expect(ipcHandleMock).toHaveBeenCalledWith('import:preview-transactions', expect.any(Function));
    expect(ipcHandleMock).toHaveBeenCalledWith('import:confirm-transactions', expect.any(Function));
    expect(ipcHandleMock).toHaveBeenCalledWith('portfolio:set-initial-balance', expect.any(Function));
    expect(ipcHandleMock).toHaveBeenCalledWith('portfolio:list-positions', expect.any(Function));
    expect(ipcHandleMock).toHaveBeenCalledWith('portfolio:recalculate', expect.any(Function));
    expect(ipcHandleMock).toHaveBeenCalledWith('portfolio:migrate-year', expect.any(Function));
    expect(ipcHandleMock).toHaveBeenCalledWith('report:assets-annual', expect.any(Function));
  });

  it('delegates main window creation to injected dependency', async () => {
    const app: CreateMainLifecycleDependencies['app'] = {
      on: jest.fn() as unknown as CreateMainLifecycleDependencies['app']['on'],
      whenReady: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      quit: jest.fn(),
    };
    const browserWindow: CreateMainLifecycleDependencies['browserWindow'] = {
      getAllWindows: jest.fn<() => unknown[]>().mockReturnValue([{ id: 1 }]),
    };
    const ipcMain: CreateMainLifecycleDependencies['ipcMain'] = {
      handle: jest.fn() as unknown as CreateMainLifecycleDependencies['ipcMain']['handle'],
    };
    const createMainWindow = jest.fn();

    const lifecycle = createMainLifecycle({
      app,
      browserWindow,
      ipcMain,
      mainHandlersDependencies: createMainHandlersDependencies(),
      platform: 'linux',
      createMainWindow,
    });

    lifecycle.register();
    await Promise.resolve();

    expect(createMainWindow).toHaveBeenCalledTimes(1);
  });
});
