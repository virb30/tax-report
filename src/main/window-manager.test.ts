import { describe, expect, it, jest } from '@jest/globals';
import path from 'node:path';
import { WindowManager } from './window-manager';

type WindowStub = {
  loadURL: jest.Mock<() => Promise<void>>;
  loadFile: jest.Mock<() => Promise<void>>;
};

class FakeBrowserWindow {
  static lastOptions: unknown;
  static instance: WindowStub = {
    loadURL: jest.fn().mockResolvedValue(undefined),
    loadFile: jest.fn().mockResolvedValue(undefined),
  };

  constructor(options: unknown) {
    FakeBrowserWindow.lastOptions = options;
    return FakeBrowserWindow.instance;
  }
}

describe('WindowManager', () => {
  it('supports constructor default parameters', () => {
    const manager = new WindowManager();

    expect(manager).toBeDefined();
  });

  it('loads dev server URL when available', () => {
    process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL = 'http://localhost:5173';
    process.env.MAIN_WINDOW_VITE_NAME = 'main_window';

    const manager = new WindowManager(FakeBrowserWindow as never, '/app/.vite/build');
    manager.createMainWindow();

    expect(FakeBrowserWindow.instance.loadURL).toHaveBeenCalledWith('http://localhost:5173');
    expect(FakeBrowserWindow.instance.loadFile).not.toHaveBeenCalled();

    delete process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
    delete process.env.MAIN_WINDOW_VITE_NAME;
  });

  it('loads renderer html when dev server URL is not set', () => {
    delete process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
    process.env.MAIN_WINDOW_VITE_NAME = 'main_window';

    const manager = new WindowManager(FakeBrowserWindow as never, '/app/.vite/build');
    manager.createMainWindow();

    const expectedFilePath = path.join('/app/.vite/build', '../renderer/main_window/index.html');
    expect(FakeBrowserWindow.instance.loadFile).toHaveBeenCalledWith(expectedFilePath);

    delete process.env.MAIN_WINDOW_VITE_NAME;
  });

  it('throws when renderer app name is missing', () => {
    delete process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
    delete process.env.MAIN_WINDOW_VITE_NAME;

    const manager = new WindowManager(FakeBrowserWindow as never, '/app/.vite/build');

    expect(() => manager.createMainWindow()).toThrow('MAIN_WINDOW_VITE_NAME is not defined.');
  });
});
