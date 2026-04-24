import { app, BrowserWindow, ipcMain } from 'electron';
import { createMainLifecycle } from './infrastructure/composition/create-main-lifecycle';
import { createAndInitializeDatabase } from './database/database';
import { WindowManager } from './window-manager';
import { container, registerDependencies } from './infrastructure/container';

const windowManager = new WindowManager();

const lifecycle = createMainLifecycle({
  app,
  browserWindow: BrowserWindow,
  ipcMain,
  platform: process.platform,
  createMainWindow: () => {
    windowManager.createMainWindow();
  },
  onReady: async () => {
    const userDataPath = app.getPath('userData');
    const { database } = await createAndInitializeDatabase(userDataPath);
    registerDependencies(database);
    
    container.cradle.ipcRegistry.registerAll(ipcMain);
  },
});

lifecycle.register();
