import type { Knex } from 'knex';
import { createBrokersMigration } from './001-create-brokers';
import { createPositionsMigration } from './002-create-positions';
import { createPositionBrokerAllocationsMigration } from './003-create-position-broker-allocations';
import { createTransactionsMigration } from './004-create-transactions';
import { createAccumulatedLossesMigration } from './005-create-accumulated-losses';
import { createTaxConfigMigration } from './006-create-tax-config';
import { createAssetsMigration } from './007-create-assets';
import { createOperationsMigration } from './008-create-operations';
import { createTickerDataMigration } from './009-create-ticker-data';
import { addYearToPositionsMigration } from './010-add-year-to-positions';
import { addCodeToBrokersMigration } from './011-add-code-to-brokers';
import { addActiveToBrokersMigration } from './012-add-active-to-brokers';
import { extendTickerDataAssetCatalogMigration } from './013-extend-ticker-data-asset-catalog';
import { createDailyBrokerTaxesMigration } from './014-create-daily-broker-taxes';
import { createTransactionFeesMigration } from './015-create-transaction-fees';

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
  createTickerDataMigration,
  addYearToPositionsMigration,
  addCodeToBrokersMigration,
  addActiveToBrokersMigration,
  extendTickerDataAssetCatalogMigration,
  createDailyBrokerTaxesMigration,
  createTransactionFeesMigration,
];
