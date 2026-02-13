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
import { SetManualBaseUseCase } from './set-manual-base-use-case';

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
    const setManualBaseUseCase = new SetManualBaseUseCase(acl);
    const listPositionsUseCase = new ListPositionsUseCase(acl);
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

    const manualBaseResult = await setManualBaseUseCase.execute({
      ticker: 'IVVB11',
      broker: 'XP',
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
    });

    expect(manualBaseResult).toEqual({
      ticker: 'IVVB11',
      broker: 'XP',
      quantity: 2,
      averagePrice: 300,
      isManualBase: true,
    });

    const positionsResult = await listPositionsUseCase.execute();
    expect(positionsResult.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ticker: 'PETR4',
          broker: 'XP',
          totalCost: 201,
        }),
        expect.objectContaining({
          ticker: 'IVVB11',
          broker: 'XP',
          totalCost: 600,
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
        expect.objectContaining({
          ticker: 'IVVB11',
          quantity: 2,
          totalCost: 600,
          revenueClassification: { group: '07', code: '09' },
        }),
      ]),
    );
    expect(reportResult.items).toHaveLength(2);
  });
});
