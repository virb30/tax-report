import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Knex } from 'knex';
import { AssetType } from '../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../database';
import { AccumulatedLossRepository } from './accumulated-loss-repository';

describe('AccumulatedLossRepository', () => {
  let database: Knex;
  let repository: AccumulatedLossRepository;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);
    repository = new AccumulatedLossRepository(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('creates accumulated loss and finds by id', async () => {
    const created = await repository.create({
      assetType: AssetType.Stock,
      amount: 123.45,
    });

    const found = await repository.findById(created.id);

    expect(found).not.toBeNull();
    expect(found?.amount).toBe(123.45);
    expect(found?.assetType).toBe(AssetType.Stock);
  });

  it('returns null when id does not exist', async () => {
    const found = await repository.findById(321);

    expect(found).toBeNull();
  });

  it('finds by asset type', async () => {
    await repository.create({
      assetType: AssetType.Fii,
      amount: 100,
    });

    const found = await repository.findByAssetType(AssetType.Fii);

    expect(found).not.toBeNull();
    expect(found?.amount).toBe(100);
  });

  it('returns null when asset type does not exist', async () => {
    const found = await repository.findByAssetType(AssetType.Bdr);

    expect(found).toBeNull();
  });

  it('updates accumulated loss amount', async () => {
    const created = await repository.create({
      assetType: AssetType.Etf,
      amount: 80,
    });

    const updated = await repository.update(created.id, {
      amount: 50,
    });

    expect(updated).not.toBeNull();
    expect(updated?.amount).toBe(50);
  });

  it('returns null when updating non-existing row', async () => {
    const updated = await repository.update(654, {
      amount: 10,
    });

    expect(updated).toBeNull();
  });

  it('lists all accumulated losses', async () => {
    await repository.create({
      assetType: AssetType.Stock,
      amount: 5,
    });
    await repository.create({
      assetType: AssetType.Fii,
      amount: 7,
    });

    const rows = await repository.findAll();

    expect(rows).toHaveLength(2);
  });

  it('deletes accumulated loss', async () => {
    const created = await repository.create({
      assetType: AssetType.Bdr,
      amount: 15,
    });

    const deleted = await repository.delete(created.id);
    const foundAfterDelete = await repository.findById(created.id);

    expect(deleted).toBe(true);
    expect(foundAfterDelete).toBeNull();
  });

  it('returns false when deleting non-existing row', async () => {
    const deleted = await repository.delete(9898);

    expect(deleted).toBe(false);
  });

  it('enforces unique asset type', async () => {
    await repository.create({
      assetType: AssetType.Stock,
      amount: 1,
    });

    await expect(
      repository.create({
        assetType: AssetType.Stock,
        amount: 2,
      }),
    ).rejects.toThrow();
  });

  it('throws if created accumulated loss cannot be loaded', async () => {
    const findByAssetTypeSpy = jest.spyOn(repository, 'findByAssetType').mockResolvedValueOnce(null);
    const findByIdSpy = jest.spyOn(repository, 'findById').mockResolvedValueOnce(null);

    await expect(
      repository.create({
        assetType: AssetType.Etf,
        amount: 9,
      }),
    ).rejects.toThrow('Created accumulated loss was not found.');

    findByAssetTypeSpy.mockRestore();
    findByIdSpy.mockRestore();
  });
});
