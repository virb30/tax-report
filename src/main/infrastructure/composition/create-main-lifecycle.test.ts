import { describe, expect, it, jest } from '@jest/globals';
import { AssetType } from '../../../shared/types/domain';
import { createMainLifecycle, type CreateMainLifecycleDependencies } from './create-main-lifecycle';

describe('createMainLifecycle', () => {
  function createMainHandlersDependencies(): CreateMainLifecycleDependencies['mainHandlersDependencies'] {
    return {
      checkHealth: () => ({ status: 'ok' }),
      previewImportFromFile: () => Promise.resolve({ commands: [] }),
      importOperations: () =>
        Promise.resolve({
        createdOperationsCount: 1,
        recalculatedPositionsCount: 1,
        }),
      confirmImportOperations: () =>
        Promise.resolve({
        createdOperationsCount: 1,
        recalculatedPositionsCount: 1,
        }),
      setManualBase: () =>
        Promise.resolve({
        ticker: 'PETR4',
        broker: 'XP',
        quantity: 1,
        averagePrice: 10,
        isManualBase: true,
        }),
      listPositions: () => Promise.resolve({ items: [] }),
      generateAssetsReport: () =>
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
    expect(ipcHandleMock).toHaveBeenCalledWith('import:preview-file', expect.any(Function));
    expect(ipcHandleMock).toHaveBeenCalledWith('import:operations', expect.any(Function));
    expect(ipcHandleMock).toHaveBeenCalledWith('import:confirm-operations', expect.any(Function));
    expect(ipcHandleMock).toHaveBeenCalledWith('portfolio:set-manual-base', expect.any(Function));
    expect(ipcHandleMock).toHaveBeenCalledWith('portfolio:list-positions', expect.any(Function));
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
