import { describe, expect, it, jest } from '@jest/globals';
import { AppLifecycle } from './app-lifecycle';

type AppStub = {
  on: jest.Mock;
  whenReady: jest.Mock<() => Promise<void>>;
  quit: jest.Mock;
};

function createAppStub(): AppStub {
  return {
    on: jest.fn<any>(),
    whenReady: jest.fn<any>().mockResolvedValue(undefined as never),
    quit: jest.fn<any>(),
  };
}

describe('AppLifecycle', () => {
  it('creates the main window on app ready', async () => {
    const app = createAppStub();
    const createMainWindow = jest.fn();

    const lifecycle = new AppLifecycle({
      app,
      browserWindow: { getAllWindows: () => [] },
      createMainWindow,
      platform: 'linux',
    });

    lifecycle.register();
    await Promise.resolve();

    expect(createMainWindow).toHaveBeenCalledTimes(1);
  });

  it('creates a new window on activate when no window is open', async () => {
    const app = createAppStub();
    const createMainWindow = jest.fn();

    const lifecycle = new AppLifecycle({
      app,
      browserWindow: { getAllWindows: () => [] },
      createMainWindow,
      platform: 'linux',
    });

    lifecycle.register();
    await Promise.resolve();

    const activateHandler = app.on.mock.calls.find((call) => call[0] === 'activate')?.[1] as (() => void) | undefined;
    if (!activateHandler) {
      throw new Error('Activate handler not registered.');
    }

    activateHandler();

    expect(createMainWindow).toHaveBeenCalledTimes(2);
  });

  it('does not create window on activate when one already exists', async () => {
    const app = createAppStub();
    const createMainWindow = jest.fn();

    const lifecycle = new AppLifecycle({
      app,
      browserWindow: { getAllWindows: () => [{ id: 1 }] },
      createMainWindow,
      platform: 'linux',
    });

    lifecycle.register();
    await Promise.resolve();

    const activateHandler = app.on.mock.calls.find((call) => call[0] === 'activate')?.[1] as (() => void) | undefined;
    if (!activateHandler) {
      throw new Error('Activate handler not registered.');
    }

    activateHandler();

    expect(createMainWindow).toHaveBeenCalledTimes(1);
  });

  it('quits app when all windows are closed on non-darwin', () => {
    const app = createAppStub();

    const lifecycle = new AppLifecycle({
      app,
      browserWindow: { getAllWindows: () => [] },
      createMainWindow: jest.fn(),
      platform: 'linux',
    });

    lifecycle.register();

    const closeHandler = app.on.mock.calls.find((call) => call[0] === 'window-all-closed')?.[1] as (() => void) | undefined;
    if (!closeHandler) {
      throw new Error('window-all-closed handler not registered.');
    }

    closeHandler();

    expect(app.quit).toHaveBeenCalledTimes(1);
  });

  it('does not quit app on darwin when all windows are closed', () => {
    const app = createAppStub();

    const lifecycle = new AppLifecycle({
      app,
      browserWindow: { getAllWindows: () => [] },
      createMainWindow: jest.fn(),
      platform: 'darwin',
    });

    lifecycle.register();

    const closeHandler = app.on.mock.calls.find((call) => call[0] === 'window-all-closed')?.[1] as (() => void) | undefined;
    if (!closeHandler) {
      throw new Error('window-all-closed handler not registered.');
    }

    closeHandler();

    expect(app.quit).not.toHaveBeenCalled();
  });

  it('quits app if whenReady fails', async () => {
    const app = createAppStub();
    app.whenReady.mockRejectedValue(new Error('startup failure'));

    const lifecycle = new AppLifecycle({
      app,
      browserWindow: { getAllWindows: () => [] },
      createMainWindow: jest.fn(),
      platform: 'linux',
    });

    lifecycle.register();
    await Promise.resolve();
    await Promise.resolve();

    expect(app.quit).toHaveBeenCalledTimes(1);
  });
});
