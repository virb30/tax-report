
import { AppLifecycle } from './app-lifecycle';
import { ElectronAppStub } from './__stubs__/electron-app.stub';

describe('AppLifecycle', () => {
  let app: ElectronAppStub;

  beforeEach(() => {
    app = new ElectronAppStub();
    jest.clearAllMocks();
  });

  it('creates the main window on app ready', async () => {
    const createMainWindow = jest.fn();

    const lifecycle = new AppLifecycle({
      app,
      browserWindow: { getAllWindows: () => [] },
      createMainWindow,
      platform: 'linux',
    });

    lifecycle.register();
    app.simulateReady();
    await app.whenReady();

    expect(createMainWindow).toHaveBeenCalledTimes(1);
  });

  it('creates a new window on activate when no window is open', async () => {
    const createMainWindow = jest.fn();

    const lifecycle = new AppLifecycle({
      app,
      browserWindow: { getAllWindows: () => [] },
      createMainWindow,
      platform: 'linux',
    });

    lifecycle.register();
    app.simulateReady();
    await app.whenReady();

    expect(app.listenerCount('activate')).toBe(1);

    const activateHandler = app.listeners('activate')[0];
    activateHandler();

    expect(createMainWindow).toHaveBeenCalledTimes(2);
  });

  it('does not create window on activate when one already exists', async () => {
    const createMainWindow = jest.fn();

    const lifecycle = new AppLifecycle({
      app,
      browserWindow: { getAllWindows: () => [{ id: 1 }] },
      createMainWindow,
      platform: 'linux',
    });

    lifecycle.register();
    app.simulateReady();
    await app.whenReady();

    expect(app.listenerCount('activate')).toBe(1);

    const activateHandler = app.listeners('activate')[0];
    activateHandler();

    expect(createMainWindow).toHaveBeenCalledTimes(1);
  });

  it('quits app when all windows are closed on non-darwin', () => {
    const lifecycle = new AppLifecycle({
      app,
      browserWindow: { getAllWindows: () => [] },
      createMainWindow: jest.fn(),
      platform: 'linux',
    });

    lifecycle.register();

    expect(app.listenerCount('window-all-closed')).toBe(1);

    const closeHandler = app.listeners('window-all-closed')[0];
    closeHandler();
    expect(app.quit).toHaveBeenCalledTimes(1);
  });

  it('does not quit app on darwin when all windows are closed', () => {
    const lifecycle = new AppLifecycle({
      app,
      browserWindow: { getAllWindows: () => [] },
      createMainWindow: jest.fn(),
      platform: 'darwin',
    });

    lifecycle.register();

    expect(app.listenerCount('window-all-closed')).toBe(1);

    const closeHandler = app.listeners('window-all-closed')[0];
    closeHandler();

    expect(app.quit).not.toHaveBeenCalled();
  });

  it('quits app if whenReady fails', async () => {
    jest.spyOn(app, 'whenReady').mockRejectedValue(new Error('Falha catastrófica'));
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
