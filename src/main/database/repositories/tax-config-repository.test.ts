import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Knex } from 'knex';
import { AssetType } from '../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../database';
import { TaxConfigRepository } from './tax-config-repository';

describe('TaxConfigRepository with seed data', () => {
  let database: Knex;
  let repository: TaxConfigRepository;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);
    repository = new TaxConfigRepository(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('finds config by asset type', async () => {
    const config = await repository.findByAssetType(AssetType.Stock);

    expect(config).not.toBeNull();
    expect(config?.taxRate).toBe(0.15);
    expect(config?.monthlyExemptionLimit).toBe(20000);
  });

  it('returns null when config by asset type does not exist', async () => {
    const deleted = await repository.findAll();
    for (const item of deleted) {
      await repository.delete(item.id);
    }

    const config = await repository.findByAssetType(AssetType.Stock);

    expect(config).toBeNull();
  });

  it('updates tax rate and exemption limit', async () => {
    const stock = await repository.findByAssetType(AssetType.Stock);
    if (!stock) {
      throw new Error('Expected stock configuration to exist.');
    }

    const updated = await repository.update(stock.id, {
      taxRate: 0.18,
      monthlyExemptionLimit: 15000,
      irrfRate: 0.0001,
    });

    expect(updated).not.toBeNull();
    expect(updated?.taxRate).toBe(0.18);
    expect(updated?.monthlyExemptionLimit).toBe(15000);
    expect(updated?.irrfRate).toBe(0.0001);
  });

  it('returns null when updating unknown config', async () => {
    const updated = await repository.update(1000, { taxRate: 0.1 });

    expect(updated).toBeNull();
  });

  it('updates config without tax rate payload', async () => {
    const stock = await repository.findByAssetType(AssetType.Stock);
    if (!stock) {
      throw new Error('Expected stock configuration to exist.');
    }

    const updated = await repository.update(stock.id, {
      monthlyExemptionLimit: 18000,
      irrfRate: 0.00008,
    });

    expect(updated?.taxRate).toBe(0.15);
    expect(updated?.monthlyExemptionLimit).toBe(18000);
  });

  it('lists all seeded configs', async () => {
    const configs = await repository.findAll();

    expect(configs).toHaveLength(4);
  });
});

describe('TaxConfigRepository without seed data', () => {
  let database: Knex;
  let repository: TaxConfigRepository;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, false);
    repository = new TaxConfigRepository(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('creates config and finds by id', async () => {
    const created = await repository.create({
      assetType: AssetType.Stock,
      taxRate: 0.15,
      monthlyExemptionLimit: 20000,
      irrfRate: 0.00005,
    });

    const found = await repository.findById(created.id);

    expect(found).not.toBeNull();
    expect(found?.assetType).toBe(AssetType.Stock);
  });

  it('returns null when id is unknown', async () => {
    const found = await repository.findById(555);

    expect(found).toBeNull();
  });

  it('deletes config', async () => {
    const created = await repository.create({
      assetType: AssetType.Bdr,
      taxRate: 0.15,
      monthlyExemptionLimit: 0,
      irrfRate: 0.00005,
    });

    const deleted = await repository.delete(created.id);
    const found = await repository.findById(created.id);

    expect(deleted).toBe(true);
    expect(found).toBeNull();
  });

  it('returns false when deleting unknown config', async () => {
    const deleted = await repository.delete(111);

    expect(deleted).toBe(false);
  });

  it('throws if created tax config cannot be loaded', async () => {
    const findByIdSpy = jest.spyOn(repository, 'findById').mockResolvedValueOnce(null);

    await expect(
      repository.create({
        assetType: AssetType.Fii,
        taxRate: 0.2,
        monthlyExemptionLimit: 0,
        irrfRate: 0.00005,
      }),
    ).rejects.toThrow('Created tax config was not found.');

    findByIdSpy.mockRestore();
  });
});
