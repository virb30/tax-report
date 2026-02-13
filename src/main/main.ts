import { app, BrowserWindow, ipcMain } from 'electron';
import { createMainLifecycle } from './infrastructure/composition/create-main-lifecycle';
import { WindowManager } from './window-manager';

const lifecycle = createMainLifecycle({
  app,
  browserWindow: BrowserWindow,
  ipcMain,
  platform: process.platform,
  createMainWindow: () => {
    const windowManager = new WindowManager();
    windowManager.createMainWindow();
  },
});

lifecycle.register();
