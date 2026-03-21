import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { createMainLifecycle } from './infrastructure/composition/create-main-lifecycle';
import { createAndInitializeDatabase } from './database/database';
import { WindowManager } from './window-manager';
import { AppCradle, container, registerDependencies } from './infrastructure/container';

const handlersDependenciesPromise = createMainHandlersDependencies();
const windowManager = new WindowManager();

const lifecycle = createMainLifecycle({
  app,
  browserWindow: BrowserWindow,
  ipcMain,
  mainHandlersDependencies: {
    checkHealth: () => ({ status: 'ok' }),
    importSelectFile: async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Planilhas', extensions: ['csv', 'xlsx'] },
          { name: 'Todos os arquivos', extensions: ['*'] },
        ],
      });
      if (result.canceled) {
        return { filePath: null };
      }
      return { filePath: result.filePaths[0] ?? null };
    },
    previewImportTransactions: async (input: unknown) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.previewImportUseCase.execute(input as Parameters<typeof dependencies.previewImportUseCase.execute>[0]);
    },
    confirmImportTransactions: async (input: unknown) => {
      const dependencies = await handlersDependenciesPromise;
      const result = await dependencies.importTransactionsUseCase.execute(input as Parameters<typeof dependencies.importTransactionsUseCase.execute>[0]);
      return {
        importedCount: result.importedCount,
        recalculatedTickers: result.recalculatedTickers,
      };
    },
    setInitialBalance: async (input: unknown) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.setInitialBalanceUseCase.execute(input as Parameters<typeof dependencies.setInitialBalanceUseCase.execute>[0]);
    },
    listPositions: async (input: unknown) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.listPositionsUseCase.execute(input as Parameters<typeof dependencies.listPositionsUseCase.execute>[0]);
    },
    generateAssetsReport: async (input: unknown) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.generateAssetsReportUseCase.execute(input as Parameters<typeof dependencies.generateAssetsReportUseCase.execute>[0]);
    },
    recalculatePosition: async (input: unknown) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.recalculatePositionUseCase.execute(input as Parameters<typeof dependencies.recalculatePositionUseCase.execute>[0]);
    },
    migrateYear: async (input: unknown) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.migrateYearUseCase.execute(input as Parameters<typeof dependencies.migrateYearUseCase.execute>[0]);
    },
    previewConsolidatedPosition: async (input: unknown) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.importConsolidatedPositionUseCase.preview(input as Parameters<typeof dependencies.importConsolidatedPositionUseCase.preview>[0]);
    },
    importConsolidatedPosition: async (input: unknown) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.importConsolidatedPositionUseCase.execute(input as Parameters<typeof dependencies.importConsolidatedPositionUseCase.execute>[0]);
    },
    deletePosition: async (input: unknown) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.deletePositionUseCase.execute(input as Parameters<typeof dependencies.deletePositionUseCase.execute>[0]);
    },
  },
  platform: process.platform,
  createMainWindow: () => {
    windowManager.createMainWindow();
  },
  onReady: async () => {
    const container = await handlersDependenciesPromise;
    container.brokersController.register(ipcMain);
  },
});

lifecycle.register();

type MainHandlersRuntimeDependencies = AppCradle;

async function createMainHandlersDependencies(): Promise<MainHandlersRuntimeDependencies> {
  await app.whenReady();
  const userDataPath = app.getPath('userData');
  const { database } = await createAndInitializeDatabase(userDataPath);
  
  registerDependencies(database);
  
  return container.cradle;
}
