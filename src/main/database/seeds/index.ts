import type { Knex } from 'knex';
import { initialTaxConfigSeed } from './initial-tax-config';

export type DatabaseSeed = {
  name: string;
  seed: (knex: Knex) => Promise<void>;
};

export const databaseSeeds: DatabaseSeed[] = [initialTaxConfigSeed];
