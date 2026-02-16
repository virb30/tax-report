import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { AssetType, SourceType, TransactionType } from '../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { KnexBrokerRepository } from '../../infrastructure/persistence/knex-broker.repository';
import { KnexPositionRepository } from '../../infrastructure/persistence/knex-position.repository';
import { KnexTransactionRepository } from '../../infrastructure/persistence/knex-transaction.repository';
import { KnexTickerDataRepository } from '../../infrastructure/persistence/knex-ticker-data.repository';
import { GenerateAssetsReportUseCase } from './generate-assets-report-use-case';
import { ListPositionsUseCase } from './list-positions-use-case';
import { SetInitialBalanceUseCase } from './set-initial-balance/set-initial-balance-use-case';
import { ImportConsolidatedPositionUseCase } from './import-consolidated-position-use-case';
import { DeletePositionUseCase } from './delete-position-use-case';
import { ReportGenerator } from '../../domain/tax-reporting/report-generator.service';
import { CsvXlsxConsolidatedPositionParser } from '../../infrastructure/parsers/csv-xlsx-consolidated-position.parser';
import { RecalculatePositionUseCase } from './recalculate-position-use-case';

describe('Application contracts integration', () => {
  let database: Knex;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('keeps command/result compatibility for manual base, list and annual report', async () => {
    const knexPositionRepository = new KnexPositionRepository(database);
    const knexTransactionRepository = new KnexTransactionRepository(database);
    const brokerRepository = new KnexBrokerRepository(database);
    const reportGenerator = new ReportGenerator();
    const tickerDataRepository = new KnexTickerDataRepository(database);
    const setInitialBalanceUseCase = new SetInitialBalanceUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const listPositionsUseCase = new ListPositionsUseCase(
      knexPositionRepository,
      knexTransactionRepository,
      brokerRepository,
    );
    const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(
      knexTransactionRepository,
      knexPositionRepository,
      brokerRepository,
      tickerDataRepository,
      reportGenerator,
    );

    await knexTransactionRepository.saveMany([
      {
        id: 'tx-petr4-1',
        date: '2025-03-01',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: 10,
        unitPrice: 20,
        fees: 1,
        brokerId: 'broker-xp',
        sourceType: SourceType.Csv,
      },
    ]);

    const initialBalanceResult = await setInitialBalanceUseCase.execute({
      ticker: 'IVVB11',
      brokerId: 'broker-xp',
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
      year: 2025,
    });

    expect(initialBalanceResult).toEqual({
      ticker: 'IVVB11',
      brokerId: 'broker-xp',
      quantity: 2,
      averagePrice: 300,
    });

    const positionsResult = await listPositionsUseCase.execute({ baseYear: 2025 });
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

    const reportResult = await generateAssetsReportUseCase.execute({
      baseYear: 2025,
    });
    expect(reportResult.referenceDate).toBe('2025-12-31');
    expect(reportResult.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ticker: 'PETR4',
          totalQuantity: 10,
          totalCost: 201,
          revenueClassification: { group: '03', code: '01' },
          allocations: expect.arrayContaining([
            expect.objectContaining({
              brokerName: 'XP Investimentos',
              cnpj: '02.332.886/0001-04',
              quantity: 10,
              totalCost: 201,
            }),
          ]),
        }),
      ]),
    );
    expect(reportResult.items.length).toBeGreaterThanOrEqual(1);
  });

  it('imports consolidated position and deletes position end-to-end', async () => {
    const knexPositionRepository = new KnexPositionRepository(database);
    const knexTransactionRepository = new KnexTransactionRepository(database);
    const brokerRepository = new KnexBrokerRepository(database);
    const recalculatePositionUseCase = new RecalculatePositionUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const consolidatedParser = new CsvXlsxConsolidatedPositionParser();
    const importConsolidatedUseCase = new ImportConsolidatedPositionUseCase(
      consolidatedParser,
      brokerRepository,
      knexTransactionRepository,
      recalculatePositionUseCase,
    );
    const deletePositionUseCase = new DeletePositionUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const listPositionsUseCase = new ListPositionsUseCase(
      knexPositionRepository,
      knexTransactionRepository,
      brokerRepository,
    );

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'consolidated-'));
    const csvPath = path.join(tempDir, 'positions.csv');
    await fs.writeFile(
      csvPath,
      [
        'Ticker;Quantidade;Preco Medio;Corretora',
        'PETR4;100;25.50;XP',
        'VALE3;50;68;XP',
      ].join('\n'),
      'utf-8',
    );

    const importResult = await importConsolidatedUseCase.execute({
      filePath: csvPath,
      year: 2025,
    });

    expect(importResult.importedCount).toBe(2);
    expect(importResult.recalculatedTickers).toContain('PETR4');
    expect(importResult.recalculatedTickers).toContain('VALE3');

    const positionsAfterImport = await listPositionsUseCase.execute({ baseYear: 2025 });
    expect(positionsAfterImport.items.map((p) => p.ticker)).toEqual(
      expect.arrayContaining(['PETR4', 'VALE3']),
    );

    const deleteResult = await deletePositionUseCase.execute({ ticker: 'VALE3', year: 2025 });
    expect(deleteResult.deleted).toBe(true);

    const positionsAfterDelete = await listPositionsUseCase.execute({ baseYear: 2025 });
    expect(positionsAfterDelete.items.map((p) => p.ticker)).not.toContain('VALE3');
    expect(positionsAfterDelete.items.map((p) => p.ticker)).toContain('PETR4');

    await fs.rm(tempDir, { recursive: true, force: true });
  });
});
