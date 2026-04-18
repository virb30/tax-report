import type { Knex } from 'knex';
import type { DatabaseMigration } from './migrations';
import type { DatabaseSeed } from './seeds';

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

export function createMigrationSource(migrations: DatabaseMigration[]): MigrationSource {
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

export function createSeedSource(seeds: DatabaseSeed[]): SeedSource {
  return {
    getSeeds() {
      return Promise.resolve(seeds);
    },
    getSeed(seed) {
      return Promise.resolve(seed);
    },
  };
}
