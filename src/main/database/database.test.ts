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
import { TaxConfigRepository } from './repositories/tax-config-repository';

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

  it('runs migrations without seeds when requested', async () => {
    database = createDatabaseConnection(':memory:');

    await initializeDatabase(database, false);

    const hasBrokersTable = await tableExists(database, 'brokers');
    const hasAssetsTable = await tableExists(database, 'assets');
    const hasOperationsTable = await tableExists(database, 'operations');
    const hasAccumulatedLossesTable = await tableExists(database, 'accumulated_losses');
    const hasTaxConfigTable = await tableExists(database, 'tax_config');
    const taxConfigRows = await database('tax_config').select('*');

    expect(hasBrokersTable).toBe(true);
    expect(hasAssetsTable).toBe(true);
    expect(hasOperationsTable).toBe(true);
    expect(hasAccumulatedLossesTable).toBe(true);
    expect(hasTaxConfigTable).toBe(true);
    expect(taxConfigRows).toHaveLength(0);
  });

  it('runs migrations and seed data', async () => {
    database = createDatabaseConnection(':memory:');

    await initializeDatabase(database);

    const taxConfigRows = await database('tax_config')
      .select<{ asset_type: string }[]>('asset_type')
      .orderBy('asset_type', 'asc');
    const brokerRows = await database('brokers').select<{ name: string }[]>('name');

    expect(taxConfigRows).toHaveLength(4);
    expect(taxConfigRows[0]?.asset_type).toBe('bdr');
    expect(taxConfigRows[1]?.asset_type).toBe('etf');
    expect(taxConfigRows[2]?.asset_type).toBe('fii');
    expect(taxConfigRows[3]?.asset_type).toBe('stock');
    expect(brokerRows.length).toBeGreaterThanOrEqual(4);
    const brokerNames = brokerRows.map((r) => r.name);
    expect(brokerNames).toContain('XP Investimentos');
    expect(brokerNames).toContain('Clear Corretora');
    expect(brokerNames).toContain('Inter DTVM');
    expect(brokerNames).toContain('Rico Investimentos');
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
    const taxConfigRepository = new TaxConfigRepository(database);

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
    const stockTaxConfig = await taxConfigRepository.findByAssetType(AssetType.Stock);

    expect(asset.id).toBeGreaterThan(0);
    expect(operation.id).toBeGreaterThan(0);
    expect(stockTaxConfig?.taxRate).toBe(0.15);
  });
});
