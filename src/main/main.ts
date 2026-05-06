import { ElectronRuntime } from './app/infra/runtime/electron-runtime';
import { createAndInitializeDatabase } from './app/infra/database/database';
import { createMainBootstrap } from './app/infra/container';
import type { Runtime } from './app/infra/runtime/runtime';

const runtime = new ElectronRuntime();

void (async (runtime: Runtime): Promise<void> => {
  try {
    const userDataPath = runtime.getUserDataPath();
    const { database } = await createAndInitializeDatabase(userDataPath);
    const bootstrap = createMainBootstrap(database);

    runtime.registerIpcHandlers(bootstrap.ipcRegistry);

    await runtime.start();
  } catch (error: unknown) {
    console.error('[main] Failed to initialize application:', error);
    runtime.quit();
  }
})(runtime);
