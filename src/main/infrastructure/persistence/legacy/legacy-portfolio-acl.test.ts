import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { AssetType, OperationType, SourceType } from '../../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../../../database/database';
import { AssetRepository } from '../../../database/repositories/asset-repository';
import { OperationRepository } from '../../../database/repositories/operation-repository';
import { LegacyPortfolioAcl } from './legacy-portfolio-acl';

describe('LegacyPortfolioAcl', () => {
  let database: Knex;
  let assetRepository: AssetRepository;
  let operationRepository: OperationRepository;
  let acl: LegacyPortfolioAcl;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);
    assetRepository = new AssetRepository(database);
    operationRepository = new OperationRepository(database);
    acl = new LegacyPortfolioAcl(assetRepository, operationRepository);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('returns null when no asset position exists', async () => {
    const snapshot = await acl.findByTickerAndBroker({
      ticker: 'PETR4',
      broker: 'XP',
    });

    expect(snapshot).toBeNull();
  });

  it('creates and then updates a position snapshot', async () => {
    await acl.save({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 10,
      averagePrice: 30,
      isManualBase: false,
    });

    await acl.save({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 12,
      averagePrice: 31,
      isManualBase: true,
    });

    const snapshot = await acl.findByTickerAndBroker({
      ticker: 'PETR4',
      broker: 'XP',
    });

    expect(snapshot).toEqual({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 12,
      averagePrice: 31,
      isManualBase: true,
    });
  });

  it('loads and filters legacy operations by broker', async () => {
    await operationRepository.create({
      tradeDate: '2025-01-01',
      operationType: OperationType.Buy,
      ticker: 'B3SA3',
      quantity: 10,
      unitPrice: 10,
      operationalCosts: 1,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Csv,
    });
    await operationRepository.create({
      tradeDate: '2025-01-02',
      operationType: OperationType.Sell,
      ticker: 'B3SA3',
      quantity: 5,
      unitPrice: 12,
      operationalCosts: 1,
      irrfWithheld: 0,
      broker: 'NU',
      sourceType: SourceType.Csv,
    });

    const trades = await acl.findTradesByTickerAndBroker({
      ticker: 'B3SA3',
      broker: 'XP',
    });

    expect(trades).toHaveLength(1);
    expect(trades[0]?.operationType).toBe(OperationType.Buy);
    expect(trades[0]?.operationalCosts).toBe(1);
  });

  it('lists all stored positions', async () => {
    await acl.save({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 10,
      averagePrice: 30,
      isManualBase: false,
    });
    await acl.save({
      ticker: 'HGLG11',
      broker: 'XP',
      assetType: AssetType.Fii,
      quantity: 2,
      averagePrice: 150,
      isManualBase: true,
    });

    const snapshots = await acl.findAll();

    expect(snapshots).toEqual([
      {
        ticker: 'PETR4',
        broker: 'XP',
        assetType: AssetType.Stock,
        quantity: 10,
        averagePrice: 30,
        isManualBase: false,
      },
      {
        ticker: 'HGLG11',
        broker: 'XP',
        assetType: AssetType.Fii,
        quantity: 2,
        averagePrice: 150,
        isManualBase: true,
      },
    ]);
  });
});
