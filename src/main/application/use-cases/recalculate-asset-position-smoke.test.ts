import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { AssetType, OperationType, SourceType } from '../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { AssetRepository } from '../../database/repositories/asset-repository';
import { OperationRepository } from '../../database/repositories/operation-repository';
import { LegacyPortfolioAcl } from '../../infrastructure/persistence/legacy/legacy-portfolio-acl';
import { RecalculateAssetPositionUseCase } from './recalculate-asset-position-use-case';

describe('RecalculateAssetPositionUseCase smoke integration', () => {
  let database: Knex;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('recalculates and persists position from legacy operations', async () => {
    const assetRepository = new AssetRepository(database);
    const operationRepository = new OperationRepository(database);
    const acl = new LegacyPortfolioAcl(assetRepository, operationRepository);
    const useCase = new RecalculateAssetPositionUseCase(acl, acl);

    await operationRepository.create({
      tradeDate: '2025-01-10',
      operationType: OperationType.Buy,
      ticker: 'PETR4',
      quantity: 10,
      unitPrice: 20,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Pdf,
    });
    await operationRepository.create({
      tradeDate: '2025-01-15',
      operationType: OperationType.Buy,
      ticker: 'PETR4',
      quantity: 10,
      unitPrice: 30,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Pdf,
    });
    await operationRepository.create({
      tradeDate: '2025-01-20',
      operationType: OperationType.Sell,
      ticker: 'PETR4',
      quantity: 5,
      unitPrice: 40,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Pdf,
    });

    await useCase.execute({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
    });

    const savedAsset = await assetRepository.findByTickerAndBroker('PETR4', 'XP');
    expect(savedAsset?.quantity).toBe(15);
    expect(savedAsset?.averagePrice).toBe(25);
  });
});
