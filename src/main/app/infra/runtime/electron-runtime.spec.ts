import { app, BrowserWindow, ipcMain } from 'electron';
import { ElectronRuntime } from './electron-runtime';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/tax-report'),
    on: jest.fn(),
    quit: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    loadURL: jest.fn(),
  })),
  ipcMain: {
    handle: jest.fn(),
  },
}));

describe('ElectronRuntime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes the Electron ipcMain handle for direct module registration', () => {
    const runtime = new ElectronRuntime({ devServerUrl: 'http://localhost:3000' });

    expect(runtime.getIpcMain()).toBe(ipcMain);
  });

  it('starts Electron after IPC registration has already happened in modules', async () => {
    const runtime = new ElectronRuntime({ devServerUrl: 'http://localhost:3000' });

    await runtime.start();

    expect(app.whenReady).toHaveBeenCalledTimes(1);
    expect(BrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        webPreferences: expect.objectContaining({
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
        }),
      }),
    );
  });
});
