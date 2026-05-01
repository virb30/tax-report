import type { Knex } from 'knex';

export type DatabaseSeed = {
  name: string;
  seed: (knex: Knex) => Promise<void>;
};

export const databaseSeeds: DatabaseSeed[] = [];
