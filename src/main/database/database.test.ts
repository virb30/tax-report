import { afterEach, describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Knex } from 'knex';
import {
  createAndInitializeDatabase,
  createDatabaseConnection,
  getDatabasePath,
  initializeDatabase,
} from './database';
import { databaseMigrations } from './migrations';
import { AssetType, OperationType, SourceType } from '../../shared/types/domain';
import { AssetRepository } from './repositories/asset-repository';
import { OperationRepository } from './repositories/operation-repository';

async function tableExists(database: Knex, tableName: string): Promise<boolean> {
  const row = await database('sqlite_master')
    .where({ type: 'table', name: tableName })
    .first<{ name: string }>();

  return Boolean(row);
}

describe('database', () => {
  let database: Knex;

  afterEach(async () => {
    if (database) {
      await database.destroy();
    }
  });

  it('builds database path inside userData directory', () => {
    const userDataPath = '/tmp/app-user-data';

    const databasePath = getDatabasePath(userDataPath);

    expect(databasePath).toBe(path.join(userDataPath, 'tax-report.db'));
  });

  it('should run migrations', async () => {
    database = createDatabaseConnection(':memory:');

    await initializeDatabase(database, false);

    const hasBrokersTable = await tableExists(database, 'brokers');
    const hasAssetsTable = await tableExists(database, 'assets');
    const hasOperationsTable = await tableExists(database, 'operations');
    const hasAccumulatedLossesTable = await tableExists(database, 'accumulated_losses');
    const hasTaxConfigTable = await tableExists(database, 'tax_config');

    expect(hasBrokersTable).toBe(true);
    expect(hasAssetsTable).toBe(true);
    expect(hasOperationsTable).toBe(true);
    expect(hasAccumulatedLossesTable).toBe(true);
    expect(hasTaxConfigTable).toBe(true);
  });

  it('creates and initializes a file database', async () => {
    const tmpDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'tax-report-'));
    const { database: createdDatabase, databasePath } = await createAndInitializeDatabase(
      tmpDirectory,
      true,
    );
    database = createdDatabase;

    const rows = await database('tax_config').select('*');

    expect(databasePath).toBe(path.join(tmpDirectory, 'tax-report.db'));
    expect(fs.existsSync(databasePath)).toBe(true);
    expect(rows).toHaveLength(4);
  });

  it('creates file database using default runSeeds option', async () => {
    const tmpDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'tax-report-default-'));
    const { database: createdDatabase } = await createAndInitializeDatabase(tmpDirectory);
    database = createdDatabase;

    const rows = await database('tax_config').select('*');

    expect(rows).toHaveLength(4);
  });

  it('supports running migration down and up manually', async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, false);

    for (const migration of [...databaseMigrations].reverse()) {
      await migration.down(database);
    }

    const hasAssetsAfterDown = await tableExists(database, 'assets');
    expect(hasAssetsAfterDown).toBe(false);

    for (const migration of databaseMigrations) {
      await migration.up(database);
    }

    const hasAssetsAfterUp = await tableExists(database, 'assets');
    expect(hasAssetsAfterUp).toBe(true);
  });

  it('allows multiple repositories to work together', async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);

    const assetRepository = new AssetRepository(database);
    const operationRepository = new OperationRepository(database);

    const asset = await assetRepository.create({
      ticker: 'PETR4',
      name: 'Petrobras',
      cnpj: null,
      assetType: AssetType.Stock,
      broker: 'XP',
      averagePrice: 30,
      quantity: 10,
      isManualBase: false,
    });
    const operation = await operationRepository.create({
      tradeDate: '2025-01-01',
      operationType: OperationType.Buy,
      ticker: 'PETR4',
      quantity: 10,
      unitPrice: 30,
      operationalCosts: 1,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Pdf,
    });

    expect(asset.id).toBeGreaterThan(0);
    expect(operation.id).toBeGreaterThan(0);
  });
});
