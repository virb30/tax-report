import { createBackendRuntimeConfig } from '../runtime/backend-runtime-config';
import { loadBackendEnvironment } from '../runtime/load-backend-environment';
import { createAndInitializeDatabase } from './database';

export async function initializeConfiguredDatabase(
  currentDirectory: string = process.cwd(),
): Promise<string> {
  loadBackendEnvironment(currentDirectory);

  const config = createBackendRuntimeConfig(process.env, currentDirectory);
  const { database, databasePath } = await createAndInitializeDatabase(config.database, true);

  await database.destroy();

  return databasePath;
}
