import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Knex } from 'knex';
import { KnexAssetRepository } from '../../../portfolio/infra/repositories/knex-asset.repository';
import {
  createAndInitializeDatabase,
  createDatabaseConnection,
  getDatabasePath,
  initializeDatabase,
} from './database';
import { databaseMigrations } from './migrations';

async function tableExists(database: Knex, tableName: string): Promise<boolean> {
  const row = await database('sqlite_master')
    .where({ type: 'table', name: tableName })
    .first<{ name: string }>();

  return Boolean(row);
}

type TableInfoRow = {
  name: string;
  notnull: number;
};

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
    const hasMonthlyTaxClosesTable = await tableExists(database, 'monthly_tax_closes');

    expect(hasBrokersTable).toBe(true);
    expect(hasAssetsTable).toBe(true);
    expect(hasOperationsTable).toBe(true);
    expect(hasAccumulatedLossesTable).toBe(true);
    expect(hasTaxConfigTable).toBe(true);
    expect(hasMonthlyTaxClosesTable).toBe(true);

    const tickerDataColumns = (await database.raw("PRAGMA table_info('ticker_data')")) as
      | TableInfoRow[]
      | { rows: TableInfoRow[] };
    const columns = Array.isArray(tickerDataColumns) ? tickerDataColumns : tickerDataColumns.rows;
    const cnpjColumn = columns.find((column) => column.name === 'cnpj');

    expect(columns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['ticker', 'cnpj', 'name', 'asset_type', 'resolution_source']),
    );
    expect(cnpjColumn?.notnull).toBe(0);
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

  it('creates monthly_tax_closes with columns required by history and detail queries', async () => {
    database = createDatabaseConnection(':memory:');

    await initializeDatabase(database, false);

    const tableInfo: TableInfoRow[] | { rows: TableInfoRow[] } = await database.raw(
      "PRAGMA table_info('monthly_tax_closes')",
    );
    const columns = Array.isArray(tableInfo) ? tableInfo : tableInfo.rows;

    expect(columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        'month',
        'state',
        'outcome',
        'calculation_version',
        'input_fingerprint',
        'calculated_at',
        'net_tax_due',
        'carry_forward_out',
        'change_summary',
        'detail_json',
        'created_at',
        'updated_at',
      ]),
    );
    expect(columns.find((column) => column.name === 'month')?.notnull).toBe(1);
    expect(columns.find((column) => column.name === 'detail_json')?.notnull).toBe(1);
  });

  it('registers the monthly close migration after transaction fees', () => {
    expect(databaseMigrations.map((migration) => migration.name).slice(-2)).toEqual([
      '015-create-transaction-fees',
      '016-create-monthly-tax-closes',
    ]);
  });

  it('keeps rows created under the old ticker_data layout readable after migration 013', async () => {
    database = createDatabaseConnection(':memory:');

    for (const migration of databaseMigrations.slice(0, 12)) {
      await migration.up(database);
    }

    await database('ticker_data').insert({
      ticker: 'PETR4',
      cnpj: '33.000.167/0001-01',
      name: 'Petrobras',
    });

    await databaseMigrations[12]?.up(database);

    const repository = new KnexAssetRepository(database);
    const asset = await repository.findByTicker('PETR4');
    const rawRow = await database('ticker_data').where({ ticker: 'PETR4' }).first();

    expect(asset).not.toBeNull();
    expect(asset).toMatchObject({
      ticker: 'PETR4',
      issuerCnpj: '33.000.167/0001-01',
      name: 'Petrobras',
      assetType: null,
      resolutionSource: null,
    });
    expect(rawRow).toMatchObject({
      ticker: 'PETR4',
      cnpj: '33.000.167/0001-01',
      name: 'Petrobras',
      asset_type: null,
      resolution_source: null,
    });
  });
});
