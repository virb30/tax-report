import { app, BrowserWindow } from 'electron';
import { AppLifecycle } from './app-lifecycle';
import { WindowManager } from './window-manager';

const lifecycle = new AppLifecycle({
  app,
  browserWindow: BrowserWindow,
  createMainWindow: () => {
    const windowManager = new WindowManager();
    windowManager.createMainWindow();
  },
  platform: process.platform,
});

lifecycle.register();
