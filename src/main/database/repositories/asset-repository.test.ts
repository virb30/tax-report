import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Knex } from 'knex';
import { AssetType } from '../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../database';
import { AssetRepository } from './asset-repository';

describe('AssetRepository', () => {
  let database: Knex;
  let repository: AssetRepository;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);
    repository = new AssetRepository(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('creates an asset and finds it by id', async () => {
    const created = await repository.create({
      ticker: 'PETR4',
      name: 'Petrobras',
      cnpj: '33000167000101',
      assetType: AssetType.Stock,
      broker: 'XP',
      averagePrice: 31.45,
      quantity: 100,
      isManualBase: false,
    });

    const found = await repository.findById(created.id);

    expect(found).not.toBeNull();
    expect(found?.ticker).toBe('PETR4');
    expect(found?.averagePrice).toBe(31.45);
  });

  it('returns null when asset does not exist by id', async () => {
    const found = await repository.findById(9999);

    expect(found).toBeNull();
  });

  it('finds asset by ticker and broker', async () => {
    await repository.create({
      ticker: 'VALE3',
      name: 'Vale',
      cnpj: null,
      assetType: AssetType.Stock,
      broker: 'XP',
      averagePrice: 58.9,
      quantity: 20,
      isManualBase: true,
    });

    const found = await repository.findByTickerAndBroker('VALE3', 'XP');

    expect(found).not.toBeNull();
    expect(found?.isManualBase).toBe(true);
  });

  it('updates average price and quantity', async () => {
    const created = await repository.create({
      ticker: 'ITSA4',
      name: 'Itausa',
      cnpj: null,
      assetType: AssetType.Stock,
      broker: 'NU',
      averagePrice: 10,
      quantity: 50,
      isManualBase: false,
    });

    const updated = await repository.update(created.id, {
      averagePrice: 11.25,
      quantity: 70,
      isManualBase: true,
    });

    expect(updated).not.toBeNull();
    expect(updated?.averagePrice).toBe(11.25);
    expect(updated?.quantity).toBe(70);
    expect(updated?.isManualBase).toBe(true);
  });

  it('updates all mutable asset fields', async () => {
    const created = await repository.create({
      ticker: 'EQTL3',
      name: null,
      cnpj: null,
      assetType: AssetType.Stock,
      broker: 'XP',
      averagePrice: 35,
      quantity: 12,
      isManualBase: false,
    });

    const updated = await repository.update(created.id, {
      name: 'Equatorial',
      cnpj: '03200544000119',
      assetType: AssetType.Bdr,
      averagePrice: 36.2,
      quantity: 18,
      isManualBase: true,
    });

    expect(updated?.name).toBe('Equatorial');
    expect(updated?.cnpj).toBe('03200544000119');
    expect(updated?.assetType).toBe(AssetType.Bdr);
  });

  it('updates manual base flag to false without quantity change payload', async () => {
    const created = await repository.create({
      ticker: 'TIMS3',
      name: null,
      cnpj: null,
      assetType: AssetType.Stock,
      broker: 'XP',
      averagePrice: 16,
      quantity: 22,
      isManualBase: true,
    });

    const updated = await repository.update(created.id, {
      isManualBase: false,
    });

    expect(updated?.isManualBase).toBe(false);
    expect(updated?.quantity).toBe(22);
  });

  it('returns null when updating non-existing asset', async () => {
    const updated = await repository.update(777, { quantity: 1 });

    expect(updated).toBeNull();
  });

  it('lists all assets', async () => {
    await repository.create({
      ticker: 'BOVA11',
      name: null,
      cnpj: null,
      assetType: AssetType.Etf,
      broker: 'XP',
      averagePrice: 100,
      quantity: 5,
      isManualBase: false,
    });
    await repository.create({
      ticker: 'HGLG11',
      name: null,
      cnpj: null,
      assetType: AssetType.Fii,
      broker: 'XP',
      averagePrice: 170,
      quantity: 7,
      isManualBase: false,
    });

    const assets = await repository.findAll();

    expect(assets).toHaveLength(2);
    expect(assets[0]?.ticker).toBe('BOVA11');
    expect(assets[1]?.ticker).toBe('HGLG11');
  });

  it('deletes an asset', async () => {
    const created = await repository.create({
      ticker: 'ABEV3',
      name: null,
      cnpj: null,
      assetType: AssetType.Stock,
      broker: 'XP',
      averagePrice: 12.5,
      quantity: 8,
      isManualBase: false,
    });

    const deleted = await repository.delete(created.id);
    const foundAfterDelete = await repository.findById(created.id);

    expect(deleted).toBe(true);
    expect(foundAfterDelete).toBeNull();
  });

  it('returns false when deleting non-existing asset', async () => {
    const deleted = await repository.delete(404);

    expect(deleted).toBe(false);
  });

  it('enforces unique constraint for ticker and broker', async () => {
    await repository.create({
      ticker: 'BBAS3',
      name: null,
      cnpj: null,
      assetType: AssetType.Stock,
      broker: 'XP',
      averagePrice: 26.7,
      quantity: 10,
      isManualBase: false,
    });

    await expect(
      repository.create({
        ticker: 'BBAS3',
        name: null,
        cnpj: null,
        assetType: AssetType.Stock,
        broker: 'XP',
        averagePrice: 28.2,
        quantity: 20,
        isManualBase: false,
      }),
    ).rejects.toThrow();
  });

  it('throws if created asset cannot be loaded', async () => {
    const findByTickerSpy = jest
      .spyOn(repository, 'findByTickerAndBroker')
      .mockResolvedValueOnce(null);
    const findByIdSpy = jest.spyOn(repository, 'findById').mockResolvedValueOnce(null);

    await expect(
      repository.create({
        ticker: 'KLBN11',
        name: null,
        cnpj: null,
        assetType: AssetType.Stock,
        broker: 'XP',
        averagePrice: 20,
        quantity: 1,
        isManualBase: false,
      }),
    ).rejects.toThrow('Created asset was not found.');

    findByTickerSpy.mockRestore();
    findByIdSpy.mockRestore();
  });
});
