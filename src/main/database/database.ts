import path from 'node:path';
import knexModule, { type Knex } from 'knex';
import { databaseMigrations, type DatabaseMigration } from './migrations';
import { databaseSeeds, type DatabaseSeed } from './seeds';

type MigrationSource = {
  getMigrations: () => Promise<DatabaseMigration[]>;
  getMigrationName: (migration: DatabaseMigration) => string;
  getMigration: (migration: DatabaseMigration) => Promise<{
    up: (knex: Knex) => Promise<void>;
    down: (knex: Knex) => Promise<void>;
  }>;
};

type SeedSource = {
  getSeeds: () => Promise<DatabaseSeed[]>;
  getSeed: (seed: DatabaseSeed) => Promise<DatabaseSeed>;
};

const DEFAULT_DATABASE_FILE_NAME = 'tax-report.db';

function createMigrationSource(migrations: DatabaseMigration[]): MigrationSource {
  return {
    getMigrations() {
      return Promise.resolve(migrations);
    },
    getMigrationName(migration) {
      return migration.name;
    },
    getMigration(migration) {
      return Promise.resolve(migration);
    },
  };
}

function createSeedSource(seeds: DatabaseSeed[]): SeedSource {
  return {
    getSeeds() {
      return Promise.resolve(seeds);
    },
    getSeed(seed) {
      return Promise.resolve(seed);
    },
  };
}

export function getDatabasePath(userDataPath: string): string {
  return path.join(userDataPath, DEFAULT_DATABASE_FILE_NAME);
}

export function createDatabaseConnection(databasePath: string): Knex {
  return knexModule({
    client: 'better-sqlite3',
    useNullAsDefault: true,
    connection: {
      filename: databasePath,
    },
    pool: {
      min: 1,
      max: 1,
      afterCreate(connection: Knex.RawConnection, done: (error: Error | null, connection: Knex.RawConnection) => void) {
        const sqliteConnection = connection as {
          pragma: (command: string) => void;
        };

        sqliteConnection.pragma('foreign_keys = ON');
        done(null, connection);
      },
    },
  });
}

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
