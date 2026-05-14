import fs from 'node:fs/promises';
import path from 'node:path';
import type { Knex } from 'knex';
import { databaseMigrations } from './migrations';
import { databaseSeeds } from './seeds';
import {
  createDatabaseConnection,
  getDatabasePath,
  type DatabaseConfig,
} from './database-connection';
import { createMigrationSource, createSeedSource } from './database-sources';

export { createDatabaseConnection, getDatabasePath } from './database-connection';

async function ensureDatabaseFile(databasePath: string): Promise<void> {
  if (databasePath === ':memory:') {
    return;
  }

  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  const fileHandle = await fs.open(databasePath, 'a');
  await fileHandle.close();
}

export async function initializeDatabase(database: Knex, runSeeds: boolean = true): Promise<void> {
  const migrationSource = createMigrationSource(databaseMigrations);
  await database.migrate.latest({
    migrationSource,
  });

  if (runSeeds && databaseSeeds.length > 0) {
    const seedSource = createSeedSource(databaseSeeds);
    await database.seed.run({
      seedSource,
    });
  }
}

export async function createAndInitializeDatabase(
  config: DatabaseConfig,
  runSeeds: boolean = true,
): Promise<{ database: Knex; databasePath: string }> {
  const databasePath = getDatabasePath(config);
  await ensureDatabaseFile(databasePath);
  const database = createDatabaseConnection(databasePath);
  await initializeDatabase(database, runSeeds);
  return { database, databasePath };
}
