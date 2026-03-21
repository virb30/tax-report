import { describe, expect, it, jest } from '@jest/globals';
import { createMainLifecycle, type CreateMainLifecycleDependencies } from './create-main-lifecycle';

describe('createMainLifecycle', () => {
  it('creates lifecycle correctly', () => {
    const app: CreateMainLifecycleDependencies['app'] = {
      on: jest.fn() as unknown as CreateMainLifecycleDependencies['app']['on'],
      whenReady: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      quit: jest.fn(),
    };
    const browserWindow: CreateMainLifecycleDependencies['browserWindow'] = {
      getAllWindows: jest.fn<() => unknown[]>().mockReturnValue([]),
    };
    const ipcMain: CreateMainLifecycleDependencies['ipcMain'] = {
      handle: jest.fn() as unknown as CreateMainLifecycleDependencies['ipcMain']['handle'],
    };
    const createMainWindow = jest.fn();

    const lifecycle = createMainLifecycle({
      app,
      browserWindow,
      ipcMain,
      platform: 'linux',
      createMainWindow,
    });

    expect(lifecycle).toBeDefined();
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
      platform: 'linux',
      createMainWindow,
    });

    lifecycle.register();
    await Promise.resolve();

    expect(createMainWindow).toHaveBeenCalledTimes(1);
  });
});
