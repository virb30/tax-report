import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { KnexTickerDataRepository } from './knex-ticker-data.repository';

describe('KnexTickerDataRepository', () => {
  let database: Knex;
  let repository: KnexTickerDataRepository;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, false);
    repository = new KnexTickerDataRepository(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('saves and finds ticker data by ticker', async () => {
    await repository.save({
      ticker: 'PETR4',
      cnpj: '33.000.167/0001-01',
      name: 'Petrobras',
    });

    const found = await repository.findByTicker('PETR4');
    expect(found).toEqual({
      ticker: 'PETR4',
      cnpj: '33.000.167/0001-01',
      name: 'Petrobras',
    });
  });

  it('returns null when ticker not found', async () => {
    const found = await repository.findByTicker('UNKNOWN');
    expect(found).toBeNull();
  });

  it('updates existing ticker on save (upsert)', async () => {
    await repository.save({
      ticker: 'VALE3',
      cnpj: '33.592.510/0001-54',
      name: 'Vale',
    });
    await repository.save({
      ticker: 'VALE3',
      cnpj: '33.592.510/0001-54',
      name: 'Vale S.A.',
    });

    const found = await repository.findByTicker('VALE3');
    expect(found?.name).toBe('Vale S.A.');
  });

  it('findAll returns all tickers ordered', async () => {
    await repository.save({ ticker: 'PETR4', cnpj: '33.000.167/0001-01' });
    await repository.save({ ticker: 'VALE3', cnpj: '33.592.510/0001-54' });
    await repository.save({ ticker: 'ABEV3', cnpj: '07.526.557/0001-00' });

    const all = await repository.findAll();
    expect(all).toHaveLength(3);
    expect(all.map((t) => t.ticker)).toEqual(['ABEV3', 'PETR4', 'VALE3']);
  });
});
