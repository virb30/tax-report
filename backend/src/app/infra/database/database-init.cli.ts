import { initializeConfiguredDatabase } from './database-runtime-initializer';

async function runDatabaseInitialization(): Promise<void> {
  const databasePath = await initializeConfiguredDatabase();
  console.log(`Tax Report database initialized at ${databasePath}`);
}

void runDatabaseInitialization().catch((error: unknown) => {
  console.error('Failed to initialize Tax Report database', error);
  process.exitCode = 1;
});
