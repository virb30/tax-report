import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { AssetType, OperationType, SourceType } from '../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { AssetRepository } from '../../database/repositories/asset-repository';
import { OperationRepository } from '../../database/repositories/operation-repository';
import { LegacyPortfolioAcl } from '../../infrastructure/persistence/legacy/legacy-portfolio-acl';
import { ImportBrokerageNoteUseCase } from './import-brokerage-note-use-case';
import { RecalculateAssetPositionUseCase } from './recalculate-asset-position-use-case';

describe('ImportBrokerageNoteUseCase integration', () => {
  let database: Knex;
  let assetRepository: AssetRepository;
  let operationRepository: OperationRepository;
  let importBrokerageNoteUseCase: ImportBrokerageNoteUseCase;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);

    assetRepository = new AssetRepository(database);
    operationRepository = new OperationRepository(database);

    const acl = new LegacyPortfolioAcl(assetRepository, operationRepository);
    const recalculateAssetPositionUseCase = new RecalculateAssetPositionUseCase(acl, acl);

    importBrokerageNoteUseCase = new ImportBrokerageNoteUseCase(
      operationRepository,
      recalculateAssetPositionUseCase,
    );
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('imports note with multiple assets and recalculates average price using allocated costs', async () => {
    const result = await importBrokerageNoteUseCase.execute({
      tradeDate: '2025-03-10',
      broker: 'XP',
      sourceType: SourceType.Pdf,
      totalOperationalCosts: 3,
      operations: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          operationType: OperationType.Buy,
          quantity: 10,
          unitPrice: 20,
          irrfWithheld: 0,
        },
        {
          ticker: 'VALE3',
          assetType: AssetType.Stock,
          operationType: OperationType.Buy,
          quantity: 5,
          unitPrice: 40,
          irrfWithheld: 0,
        },
      ],
    });

    const persistedOperations = await operationRepository.findAll();
    expect(persistedOperations).toHaveLength(2);
    expect(persistedOperations[0]?.operationalCosts).toBe(1.5);
    expect(persistedOperations[1]?.operationalCosts).toBe(1.5);

    const totalOperationalCosts = persistedOperations.reduce(
      (sum, operation) => sum + operation.operationalCosts,
      0,
    );
    expect(totalOperationalCosts).toBeCloseTo(3, 2);

    const petrPosition = await assetRepository.findByTickerAndBroker('PETR4', 'XP');
    const valePosition = await assetRepository.findByTickerAndBroker('VALE3', 'XP');

    expect(petrPosition?.quantity).toBe(10);
    expect(petrPosition?.averagePrice).toBeCloseTo(20.15, 2);
    expect(valePosition?.quantity).toBe(5);
    expect(valePosition?.averagePrice).toBeCloseTo(40.3, 2);
    expect(result).toEqual({
      createdOperationsCount: 2,
      recalculatedPositionsCount: 2,
    });
  });

  it('keeps compatibility for single-asset notes with zero operational costs', async () => {
    await importBrokerageNoteUseCase.execute({
      tradeDate: '2025-03-11',
      broker: 'XP',
      sourceType: SourceType.Csv,
      totalOperationalCosts: 0,
      operations: [
        {
          ticker: 'ITUB4',
          assetType: AssetType.Stock,
          operationType: OperationType.Buy,
          quantity: 8,
          unitPrice: 30,
          irrfWithheld: 0,
        },
      ],
    });

    const persistedOperations = await operationRepository.findByTicker('ITUB4');
    expect(persistedOperations).toHaveLength(1);
    expect(persistedOperations[0]?.operationalCosts).toBe(0);

    const position = await assetRepository.findByTickerAndBroker('ITUB4', 'XP');
    expect(position?.quantity).toBe(8);
    expect(position?.averagePrice).toBe(30);
  });
});
