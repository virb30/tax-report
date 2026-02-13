import type { Knex } from 'knex';
import { createAssetsMigration } from './001-create-assets';
import { createOperationsMigration } from './002-create-operations';
import { createAccumulatedLossesMigration } from './003-create-accumulated-losses';
import { createTaxConfigMigration } from './004-create-tax-config';
import { addImportIdempotencyToOperationsMigration } from './005-add-import-idempotency-to-operations';

export type DatabaseMigration = {
  name: string;
  up: (knex: Knex) => Promise<void>;
  down: (knex: Knex) => Promise<void>;
};

export const databaseMigrations: DatabaseMigration[] = [
  createAssetsMigration,
  createOperationsMigration,
  createAccumulatedLossesMigration,
  createTaxConfigMigration,
  addImportIdempotencyToOperationsMigration,
];
