import type { Knex } from 'knex';
import { createBrokersMigration } from './001-create-brokers';
import { createPositionsMigration } from './002-create-positions';
import { createPositionBrokerAllocationsMigration } from './003-create-position-broker-allocations';
import { createTransactionsMigration } from './004-create-transactions';
import { createAccumulatedLossesMigration } from './005-create-accumulated-losses';
import { createTaxConfigMigration } from './006-create-tax-config';
import { createAssetsMigration } from './007-create-assets';
import { createOperationsMigration } from './008-create-operations';

export type DatabaseMigration = {
  name: string;
  up: (knex: Knex) => Promise<void>;
  down: (knex: Knex) => Promise<void>;
};

export const databaseMigrations: DatabaseMigration[] = [
  createBrokersMigration,
  createPositionsMigration,
  createPositionBrokerAllocationsMigration,
  createTransactionsMigration,
  createAccumulatedLossesMigration,
  createTaxConfigMigration,
  createAssetsMigration,
  createOperationsMigration,
];
