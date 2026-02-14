import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { AssetType, OperationType, SourceType } from '../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { AssetRepository } from '../../database/repositories/asset-repository';
import { OperationRepository } from '../../database/repositories/operation-repository';
import { LegacyPortfolioAcl } from '../../infrastructure/persistence/legacy/legacy-portfolio-acl';
import { GenerateAssetsReportUseCase } from './generate-assets-report-use-case';
import { ImportBrokerageNoteUseCase } from './import-brokerage-note-use-case';
import { ImportOperationsUseCase } from './import-operations-use-case';
import { ListPositionsUseCase } from './list-positions-use-case';
import { RecalculateAssetPositionUseCase } from './recalculate-asset-position-use-case';
import { SetInitialBalanceUseCase } from './set-initial-balance-use-case';
import { KnexPositionRepository } from '../../infrastructure/persistence/knex-position.repository';
import { KnexTransactionRepository } from '../../infrastructure/persistence/knex-transaction.repository';
import { KnexBrokerRepository } from '../../infrastructure/persistence/knex-broker.repository';

describe('Application contracts integration', () => {
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

  it('keeps command/result compatibility for import, manual base, list and annual report', async () => {
    const recalculateAssetPositionUseCase = new RecalculateAssetPositionUseCase(acl, acl);
    const importBrokerageNoteUseCase = new ImportBrokerageNoteUseCase(
      operationRepository,
      recalculateAssetPositionUseCase,
    );
    const importOperationsUseCase = new ImportOperationsUseCase(importBrokerageNoteUseCase);
    const knexPositionRepository = new KnexPositionRepository(database);
    const knexTransactionRepository = new KnexTransactionRepository(database);
    const brokerRepository = new KnexBrokerRepository(database);
    const setInitialBalanceUseCase = new SetInitialBalanceUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const listPositionsUseCase = new ListPositionsUseCase(
      knexPositionRepository,
      brokerRepository,
    );
    const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(acl, operationRepository);

    const importResult = await importOperationsUseCase.execute({
      tradeDate: '2025-03-01',
      broker: 'XP',
      sourceType: SourceType.Pdf,
      totalOperationalCosts: 1,
      operations: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          operationType: OperationType.Buy,
          quantity: 10,
          unitPrice: 20,
          irrfWithheld: 0,
        },
      ],
    });

    expect(importResult).toEqual({
      createdOperationsCount: 1,
      recalculatedPositionsCount: 1,
    });

    const initialBalanceResult = await setInitialBalanceUseCase.execute({
      ticker: 'IVVB11',
      brokerId: 'broker-xp',
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
    });

    expect(initialBalanceResult).toEqual({
      ticker: 'IVVB11',
      brokerId: 'broker-xp',
      quantity: 2,
      averagePrice: 300,
    });

    const positionsResult = await listPositionsUseCase.execute();
    expect(positionsResult.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ticker: 'IVVB11',
          totalCost: 600,
          brokerBreakdown: expect.arrayContaining([
            expect.objectContaining({ brokerId: 'broker-xp', quantity: 2 }),
          ]),
        }),
      ]),
    );

    await operationRepository.create({
      tradeDate: '2026-01-10',
      operationType: OperationType.Sell,
      ticker: 'PETR4',
      quantity: 10,
      unitPrice: 22,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Csv,
    });

    const reportResult = await generateAssetsReportUseCase.execute({
      baseYear: 2025,
    });
    expect(reportResult.referenceDate).toBe('2025-12-31');
    expect(reportResult.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ticker: 'PETR4',
          quantity: 10,
          totalCost: 201,
          revenueClassification: { group: '03', code: '01' },
        }),
      ]),
    );
    expect(reportResult.items).toHaveLength(1);
  });
});
