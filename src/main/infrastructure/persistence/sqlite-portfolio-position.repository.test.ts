import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { AssetRepository } from '../../database/repositories/asset-repository';
import { AssetType } from '../../../shared/types/domain';
import { SqlitePortfolioPositionRepository } from './sqlite-portfolio-position.repository';

describe('SqlitePortfolioPositionRepository', () => {
  let database: Knex;
  let assetRepository: AssetRepository;
  let repository: SqlitePortfolioPositionRepository;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);
    assetRepository = new AssetRepository(database);
    repository = new SqlitePortfolioPositionRepository(assetRepository);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('returns null when position does not exist', async () => {
    const position = await repository.findByTickerAndBroker({
      ticker: 'PETR4',
      broker: 'XP',
    });

    expect(position).toBeNull();
  });

  it('creates and updates persisted snapshots', async () => {
    await repository.save({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 10,
      averagePrice: 30,
      isManualBase: true,
    });

    await repository.save({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 12,
      averagePrice: 31,
      isManualBase: false,
    });

    const position = await repository.findByTickerAndBroker({
      ticker: 'PETR4',
      broker: 'XP',
    });

    expect(position).toEqual({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 12,
      averagePrice: 31,
      isManualBase: false,
    });
  });

  it('lists all mapped snapshots', async () => {
    await assetRepository.create({
      ticker: 'PETR4',
      broker: 'XP',
      name: null,
      cnpj: null,
      assetType: AssetType.Stock,
      quantity: 10,
      averagePrice: 20,
      isManualBase: false,
    });

    const positions = await repository.findAll();

    expect(positions).toHaveLength(1);
    expect(positions[0]?.ticker).toBe('PETR4');
  });
});
