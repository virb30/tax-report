import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import type { Knex } from 'knex';
import { AssetType, AssetTypeSource, SourceType, TransactionType } from '../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { KnexBrokerRepository } from '../../infrastructure/repositories/knex-broker.repository';
import { KnexPositionRepository } from '../../infrastructure/repositories/knex-position.repository';
import { KnexTransactionRepository } from '../../infrastructure/repositories/knex-transaction.repository';
import { KnexAssetRepository } from '../../infrastructure/repositories/knex-asset.repository';
import { GenerateAssetsReportUseCase } from './generate-asset-report/generate-assets-report.use-case';
import { ListPositionsUseCase } from './list-positions/list-positions-use-case';
import { DeleteInitialBalanceDocumentUseCase } from './delete-initial-balance-document/delete-initial-balance-document.use-case';
import { ImportConsolidatedPositionUseCase } from './import-consolidated-position/import-consolidated-position-use-case';
import { ListInitialBalanceDocumentsUseCase } from './list-initial-balance-documents/list-initial-balance-documents.use-case';
import { DeletePositionUseCase } from './delete-position/delete-position.use-case';
import { RepairAssetTypeUseCase } from './repair-asset-type/repair-asset-type.use-case';
import { CsvXlsxConsolidatedPositionParser } from '../../infrastructure/parsers/csv-xlsx-consolidated-position.parser';
import { RecalculatePositionUseCase } from './recalculate-position/recalculate-position.use-case';
import { MemoryQueueAdapter } from '../../infrastructure/events/memory-queue.adapter';
import { RecalculatePositionHandler } from '../../infrastructure/handlers/recalculate-position.handler';
import { SaveInitialBalanceDocumentUseCase } from './save-initial-balance-document/save-initial-balance-document.use-case';
import { Transaction } from '../../domain/portfolio/entities/transaction.entity';
import { Asset } from '../../domain/portfolio/entities/asset.entity';
import { Broker } from '../../domain/portfolio/entities/broker.entity';
import { AssetPosition } from '../../domain/portfolio/entities/asset-position.entity';
import { Cnpj } from '../../domain/shared/cnpj.vo';
import { Money } from '../../domain/portfolio/value-objects/money.vo';
import { Quantity } from '../../domain/portfolio/value-objects/quantity.vo';
import { InitialBalanceDocumentPositionSyncService } from '../services/initial-balance-document-position-sync.service';
import { ReprocessTickerYearsService } from '../services/reprocess-ticker-years.service';

describe('Application contracts integration', () => {
  let database: Knex;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('saves, lists, and deletes initial balance documents while keeping positions and reports consistent', async () => {
    const knexPositionRepository = new KnexPositionRepository(database);
    const knexTransactionRepository = new KnexTransactionRepository(database);
    const brokerRepository = new KnexBrokerRepository(database);
    const tickerDataRepository = new KnexAssetRepository(database);
    const positionSyncService = new InitialBalanceDocumentPositionSyncService(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const saveInitialBalanceDocumentUseCase = new SaveInitialBalanceDocumentUseCase(
      knexTransactionRepository,
      positionSyncService,
    );
    const listInitialBalanceDocumentsUseCase = new ListInitialBalanceDocumentsUseCase(
      knexTransactionRepository,
      knexPositionRepository,
    );
    const deleteInitialBalanceDocumentUseCase = new DeleteInitialBalanceDocumentUseCase(
      knexTransactionRepository,
      positionSyncService,
    );
    const listPositionsUseCase = new ListPositionsUseCase(knexPositionRepository, brokerRepository);
    const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(
      knexPositionRepository,
      brokerRepository,
      tickerDataRepository,
      knexTransactionRepository,
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
        quantity: Quantity.from(10),
        unitPrice: Money.from(20),
        fees: Money.from(1),
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

    const initialBalanceResult = await saveInitialBalanceDocumentUseCase.execute({
      ticker: 'IVVB11',
      year: 2025,
      assetType: AssetType.Etf,
      averagePrice: '300',
      allocations: [{ brokerId: brokerId.value, quantity: '2' }],
    });

    expect(initialBalanceResult).toEqual({
      ticker: 'IVVB11',
      year: 2025,
      assetType: AssetType.Etf,
      averagePrice: '300',
      allocations: [{ brokerId: brokerId.value, quantity: '2' }],
      totalQuantity: '2',
    });

    await expect(listInitialBalanceDocumentsUseCase.execute({ year: 2025 })).resolves.toEqual({
      items: [
        {
          ticker: 'IVVB11',
          year: 2025,
          assetType: AssetType.Etf,
          averagePrice: '300',
          allocations: [{ brokerId: brokerId.value, quantity: '2' }],
          totalQuantity: '2',
        },
      ],
    });

    const positionsResult = await listPositionsUseCase.execute({ baseYear: 2025 });
    expect(positionsResult.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ticker: 'IVVB11',
          totalCost: '600',
          brokerBreakdown: expect.arrayContaining([
            expect.objectContaining({ brokerId: brokerId.value, quantity: '2' }),
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
          currentYearValue: 201,
          previousYearValue: 0,
          revenueClassification: { group: '03', code: '01' },
          brokersSummary: expect.arrayContaining([
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

    await expect(
      deleteInitialBalanceDocumentUseCase.execute({ ticker: 'IVVB11', year: 2025 }),
    ).resolves.toEqual({
      deleted: true,
    });
    await expect(listInitialBalanceDocumentsUseCase.execute({ year: 2025 })).resolves.toEqual({
      items: [],
    });
  });

  it('imports consolidated position and deletes position end-to-end', async () => {
    const knexPositionRepository = new KnexPositionRepository(database);
    const knexTransactionRepository = new KnexTransactionRepository(database);
    const brokerRepository = new KnexBrokerRepository(database);
    const tickerDataRepository = new KnexAssetRepository(database);
    const recalculatePositionUseCase = new RecalculatePositionUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const queue = new MemoryQueueAdapter();
    new RecalculatePositionHandler(queue, recalculatePositionUseCase);
    const consolidatedParser = new CsvXlsxConsolidatedPositionParser();
    const importConsolidatedUseCase = new ImportConsolidatedPositionUseCase(
      consolidatedParser,
      tickerDataRepository,
      brokerRepository,
      knexTransactionRepository,
      queue,
    );
    const deletePositionUseCase = new DeletePositionUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const listPositionsUseCase = new ListPositionsUseCase(knexPositionRepository, brokerRepository);
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
      ['Ticker;Quantidade;Preco Medio;Corretora', 'PETR4;100;25.50;XP', 'VALE3;50;68;XP'].join(
        '\n',
      ),
      'utf-8',
    );

    const importResult = await importConsolidatedUseCase.execute({
      filePath: csvPath,
      year: 2025,
      assetTypeOverrides: [
        { ticker: 'PETR4', assetType: AssetType.Stock },
        { ticker: 'VALE3', assetType: AssetType.Stock },
      ],
    });

    expect(importResult.importedCount).toBe(2);
    expect(importResult.recalculatedTickers).toContain('PETR4');
    expect(importResult.recalculatedTickers).toContain('VALE3');
    expect(importResult.skippedUnsupportedRows).toBe(0);

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

  it('repairs a ticker asset type and reprocesses affected years end-to-end', async () => {
    const knexPositionRepository = new KnexPositionRepository(database);
    const knexTransactionRepository = new KnexTransactionRepository(database);
    const tickerDataRepository = new KnexAssetRepository(database);
    const recalculatePositionUseCase = new RecalculatePositionUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const repairAssetTypeUseCase = new RepairAssetTypeUseCase(
      tickerDataRepository,
      knexTransactionRepository,
      new ReprocessTickerYearsService(recalculatePositionUseCase),
    );
    const broker = Broker.create({
      name: 'Repair Broker',
      cnpj: new Cnpj('11.111.111/0001-00'),
      code: 'RPR1',
    });

    await new KnexBrokerRepository(database).save(broker);
    await tickerDataRepository.save(
      Asset.create({
        ticker: 'AAPL34',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.File,
      }),
    );
    await knexTransactionRepository.saveMany([
      Transaction.create({
        date: '2024-01-10',
        type: TransactionType.Buy,
        ticker: 'AAPL34',
        quantity: Quantity.from(1),
        unitPrice: Money.from(100),
        fees: Money.from(0),
        brokerId: broker.id,
        sourceType: SourceType.Csv,
      }),
      Transaction.create({
        date: '2025-01-10',
        type: TransactionType.Buy,
        ticker: 'AAPL34',
        quantity: Quantity.from(1),
        unitPrice: Money.from(100),
        fees: Money.from(0),
        brokerId: broker.id,
        sourceType: SourceType.Csv,
      }),
    ]);
    await knexPositionRepository.save(
      AssetPosition.create({
        ticker: 'AAPL34',
        assetType: AssetType.Stock,
        year: 2024,
      }),
    );
    await knexPositionRepository.save(
      AssetPosition.create({
        ticker: 'AAPL34',
        assetType: AssetType.Stock,
        year: 2025,
      }),
    );

    const result = await repairAssetTypeUseCase.execute({
      ticker: 'AAPL34',
      assetType: AssetType.Bdr,
    });

    expect(result).toEqual({
      ticker: 'AAPL34',
      assetType: AssetType.Bdr,
      affectedYears: [2024, 2025],
      reprocessedCount: 2,
    });
    await expect(tickerDataRepository.findByTicker('AAPL34')).resolves.toEqual(
      expect.objectContaining({
        assetType: AssetType.Bdr,
        resolutionSource: AssetTypeSource.Manual,
      }),
    );
    await expect(knexPositionRepository.findByTickerAndYear('AAPL34', 2024)).resolves.toEqual(
      expect.objectContaining({
        assetType: AssetType.Bdr,
      }),
    );
    await expect(knexPositionRepository.findByTickerAndYear('AAPL34', 2025)).resolves.toEqual(
      expect.objectContaining({
        assetType: AssetType.Bdr,
      }),
    );
  });
});
