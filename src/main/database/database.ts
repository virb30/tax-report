import type { Knex } from 'knex';
import { databaseMigrations } from './migrations';
import { databaseSeeds } from './seeds';
import { createDatabaseConnection, getDatabasePath } from './database-connection';
import { createMigrationSource, createSeedSource } from './database-sources';

export { createDatabaseConnection, getDatabasePath } from './database-connection';

export async function initializeDatabase(database: Knex, runSeeds: boolean = true): Promise<void> {
  const migrationSource = createMigrationSource(databaseMigrations);
  await database.migrate.latest({
    migrationSource,
  });

  if (runSeeds) {
    const seedSource = createSeedSource(databaseSeeds);
    await database.seed.run({
      seedSource,
    });
  }
}

export async function createAndInitializeDatabase(
  userDataPath: string,
  runSeeds: boolean = true,
): Promise<{ database: Knex; databasePath: string }> {
  const databasePath = getDatabasePath(userDataPath);
  const database = createDatabaseConnection(databasePath);
  await initializeDatabase(database, runSeeds);
  return { database, databasePath };
}
