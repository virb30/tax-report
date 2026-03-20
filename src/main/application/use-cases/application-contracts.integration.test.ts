import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { AssetType, SourceType, TransactionType } from '../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { KnexBrokerRepository } from '../../infrastructure/repositories/knex-broker.repository';
import { KnexPositionRepository } from '../../infrastructure/repositories/knex-position.repository';
import { KnexTransactionRepository } from '../../infrastructure/repositories/knex-transaction.repository';
import { KnexAssetRepository } from '../../infrastructure/repositories/knex-asset.repository';
import { GenerateAssetsReportUseCase } from './generate-asset-report/generate-assets-report.use-case';
import { ListPositionsUseCase } from './list-positions/list-positions-use-case';
import { SetInitialBalanceUseCase } from './set-initial-balance/set-initial-balance.use-case';
import { ImportConsolidatedPositionUseCase } from './import-consolidated-position-use-case';
import { DeletePositionUseCase } from './delete-position/delete-position.use-case';
import { ReportGenerator } from '../services/report-generator/report-generator.service';
import { CsvXlsxConsolidatedPositionParser } from '../../infrastructure/parsers/csv-xlsx-consolidated-position.parser';
import { RecalculatePositionUseCase } from './recalculate-position/recalculate-position.use-case';
import { MemoryQueueAdapter } from '../../infrastructure/events/memory-queue.adapter';
import { RecalculatePositionHandler } from '../../infrastructure/handlers/recalculate-position.handler';
import { Transaction } from '../../domain/portfolio/entities/transaction.entity';
import { Broker } from '../../domain/portfolio/entities/broker.entity';
import { AssetPosition } from '../../domain/portfolio/entities/asset-position.entity';
import { Cnpj } from '../../domain/shared/cnpj.vo';

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
    const tickerDataRepository = new KnexAssetRepository(database);
    const setInitialBalanceUseCase = new SetInitialBalanceUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const listPositionsUseCase = new ListPositionsUseCase(
      knexPositionRepository,
      brokerRepository,
    );
    const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(
      knexPositionRepository,
      brokerRepository,
      tickerDataRepository,
      reportGenerator,
    );

    const broker = Broker.create({
      name: 'Test',
      cnpj: new Cnpj('11.111.111/0001-00'),
      code: 'TEST',
    });
    const brokerId = broker.id;

    await brokerRepository.save(broker);

    await knexTransactionRepository.saveMany([
      Transaction.create({
        date: '2025-03-01',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: 10,
        unitPrice: 20,
        fees: 1,
        brokerId,
        sourceType: SourceType.Csv,
      }),
    ]);
    await knexPositionRepository.save(
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2025,
      }),
    );
    const recalculatePositionUseCase = new RecalculatePositionUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    await recalculatePositionUseCase.execute({
      ticker: 'PETR4',
      year: 2025,
    });

    const initialBalanceResult = await setInitialBalanceUseCase.execute({
      ticker: 'IVVB11',
      brokerId: brokerId.value,
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
      year: 2025,
    });

    expect(initialBalanceResult).toEqual({
      ticker: 'IVVB11',
      brokerId: brokerId.value,
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
            expect.objectContaining({ brokerId: brokerId.value, quantity: 2 }),
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
              brokerName: 'Test',
              cnpj: '11.111.111/0001-00',
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
    const queue = new MemoryQueueAdapter();
    new RecalculatePositionHandler(queue, recalculatePositionUseCase);
    const consolidatedParser = new CsvXlsxConsolidatedPositionParser();
    const importConsolidatedUseCase = new ImportConsolidatedPositionUseCase(
      consolidatedParser,
      brokerRepository,
      knexTransactionRepository,
      queue,
    );
    const deletePositionUseCase = new DeletePositionUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const listPositionsUseCase = new ListPositionsUseCase(
      knexPositionRepository,
      brokerRepository,
    );
    await knexPositionRepository.save(
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2025,
      }),
    );
    await knexPositionRepository.save(
      AssetPosition.create({
        ticker: 'VALE3',
        assetType: AssetType.Stock,
        year: 2025,
      }),
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
