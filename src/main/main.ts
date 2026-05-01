import { ElectronRuntime } from './infrastructure/runtime/electron-runtime';
import { createAndInitializeDatabase } from './database/database';
import { container, registerDependencies } from './infrastructure/container';
import type { Runtime } from './infrastructure/runtime/runtime';


const runtime = new ElectronRuntime();

void (async (runtime: Runtime): Promise<void> => {
  try {
    const userDataPath = runtime.getUserDataPath();
    const { database } = await createAndInitializeDatabase(userDataPath);

    registerDependencies(database);
    runtime.registerIpcHandlers(container.cradle.ipcRegistry);

    await runtime.start();
  } catch (error: unknown) {
    console.error('[main] Failed to initialize application:', error);
    runtime.quit();
  }
})(runtime);
