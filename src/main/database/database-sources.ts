import type { Knex } from 'knex';
import type { DatabaseMigration } from './migrations';
import type { DatabaseSeed } from './seeds';

export type MigrationSource = {
  getMigrations: () => Promise<DatabaseMigration[]>;
  getMigrationName: (migration: DatabaseMigration) => string;
  getMigration: (migration: DatabaseMigration) => Promise<{
    up: (knex: Knex) => Promise<void>;
    down: (knex: Knex) => Promise<void>;
  }>;
};

export type SeedSource = {
  getSeeds: () => Promise<DatabaseSeed[]>;
  getSeed: (seed: DatabaseSeed) => Promise<DatabaseSeed>;
};

export function createMigrationSource(migrations: DatabaseMigration[]): MigrationSource {
  return {
    async getMigrations() {
      return migrations;
    },
    getMigrationName(migration) {
      return migration.name;
    },
    async getMigration(migration) {
      return migration;
    },
  };
}

export function createSeedSource(seeds: DatabaseSeed[]): SeedSource {
  return {
    async getSeeds() {
      return seeds;
    },
    async getSeed(seed) {
      return seed;
    },
  };
}
