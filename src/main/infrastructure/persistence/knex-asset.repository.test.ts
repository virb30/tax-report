import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { KnexAssetRepository } from './knex-asset.repository';
import { Asset } from '../../domain/portfolio/entities/asset.entity';
import { Cnpj } from '../../domain/shared/cnpj.vo';

describe('KnexTickerDataRepository', () => {
  let database: Knex;
  let repository: KnexAssetRepository;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, false);
    repository = new KnexAssetRepository(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('saves and finds ticker data by ticker', async () => {
    await repository.save(Asset.create({
      ticker: 'PETR4',
      issuerCnpj: new Cnpj('33.000.167/0001-01'),
      name: 'Petrobras',
    }));

    const found = await repository.findByTickersList(['PETR4']);
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('Petrobras');
  });

  it('returns empty array when ticker not found', async () => {
    const found = await repository.findByTickersList(['UNKNOWN']);
    expect(found).toHaveLength(0);
  });

  it('updates existing ticker on save (upsert)', async () => {
    await repository.save(Asset.create({
      ticker: 'VALE3',
      issuerCnpj: new Cnpj('33.592.510/0001-54'),
      name: 'Vale',
    }));
    await repository.save(Asset.create({
      ticker: 'VALE3',
      issuerCnpj: new Cnpj('33.592.510/0001-54'),
      name: 'Vale S.A.',
    }));

    const found = await repository.findByTickersList(['VALE3']);
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('Vale S.A.');
  });

  it('findAll returns all tickers ordered', async () => {
    await repository.save(Asset.create({ ticker: 'PETR4', issuerCnpj: new Cnpj('33.000.167/0001-01'), name: 'Petrobras' }));
    await repository.save(Asset.create({ ticker: 'VALE3', issuerCnpj: new Cnpj('33.592.510/0001-54'), name: 'Vale' }));
    await repository.save(Asset.create({ ticker: 'ABEV3', issuerCnpj: new Cnpj('07.526.557/0001-00'), name: 'Ambev' }));

    const all = await repository.findAll();
    expect(all).toHaveLength(3);
    expect(all.map((a) => a.ticker)).toEqual(['ABEV3', 'PETR4', 'VALE3']);
  });
});
