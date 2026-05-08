import { ElectronRuntime } from './app/infra/runtime/electron-runtime';
import { createAndInitializeDatabase } from './app/infra/database/database';
import { createAppModule } from './app/infra/container/app-module';
import { createSharedInfrastructure } from './app/infra/container/shared-infrastructure';
import type { Runtime } from './app/infra/runtime/runtime';
import { createIngestionModule } from './ingestion/infra/container';
import { createPortfolioModule } from './portfolio/infra/container';
import { createTaxReportingModule } from './tax-reporting/infra/container';

const runtime = new ElectronRuntime();

void (async (runtime: Runtime): Promise<void> => {
  try {
    const userDataPath = runtime.getUserDataPath();
    const { database } = await createAndInitializeDatabase(userDataPath);
    const shared = createSharedInfrastructure(database);
    const appModule = createAppModule();
    const portfolioModule = createPortfolioModule(shared);
    const ingestionModule = createIngestionModule({
      shared,
      portfolio: portfolioModule.exports,
    });
    const taxReportingModule = createTaxReportingModule({
      shared,
      portfolio: portfolioModule.exports,
      ingestion: ingestionModule.repositories,
    });
    const modules = [appModule, portfolioModule, ingestionModule, taxReportingModule];

    for (const module of modules) {
      module.startup?.initialize();
    }

    const ipcMain = runtime.getIpcMain();
    for (const module of modules) {
      module.registerIpc(ipcMain);
    }

    await runtime.start();
  } catch (error: unknown) {
    console.error('[main] Failed to initialize application:', error);
    runtime.quit();
  }
})(runtime);
