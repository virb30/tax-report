import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { AssetType } from '../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { SetInitialBalanceUseCase } from '../../application/use-cases/set-initial-balance/set-initial-balance.use-case';
import { ListPositionsUseCase } from '../../application/use-cases/list-positions/list-positions-use-case';
import { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position/recalculate-position.use-case';
import { MigrateYearUseCase } from '../../application/use-cases/migrate-year/migrate-year.use-case';
import { KnexPositionRepository } from '../../infrastructure/persistence/knex-position.repository';
import { KnexTransactionRepository } from '../../infrastructure/persistence/knex-transaction.repository';
import { KnexBrokerRepository } from '../../infrastructure/persistence/knex-broker.repository';
import { KnexAssetRepository } from '../../infrastructure/persistence/knex-asset.repository';
import { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-asset-report/generate-assets-report.use-case';
import { ReportGenerator } from '../../application/services/report-generator/report-generator.service';
import { TaxApportioner } from '../../domain/ingestion/tax-apportioner.service';
import { CsvXlsxTransactionParser } from '../../infrastructure/parsers/csv-xlsx-transaction.parser';
import { SheetjsSpreadsheetFileReader } from '../../infrastructure/adapters/file-readers/sheetjs.spreadsheet.file-reader';
import { PreviewImportUseCase } from '../../application/use-cases/preview-import-use-case';
import { ImportTransactionsUseCase } from '../../application/use-cases/import-transactions-use-case';
import { AssetPosition } from '../../domain/portfolio/entities/asset-position.entity';
import {
  registerMainHandlers,
  type MainHandlersDependencies,
} from './register-main-handlers';
import { CreateBrokerUseCase } from '../../application/use-cases/create-broker/create-broker.use-case';
import { UpdateBrokerUseCase } from '../../application/use-cases/update-broker/update-broker.use-case';
import { ListBrokersUseCase } from '../../application/use-cases/list-brokers/list-brokers.use-case';
import { ToggleActiveBrokerUseCase } from '../../application/use-cases/toggle-active-broker/toggle-active-broker.use-case';

type IpcHandler = (_event: unknown, ...args: unknown[]) => unknown;

describe('IPC handlers integration', () => {
  let database: Knex;
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'tax-report-ipc-'));
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);
  });

  afterEach(async () => {
    await database.destroy();
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('runs transaction preview, confirm, manual base, list and report channels end-to-end', async () => {
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
    const recalculatePositionUseCase = new RecalculatePositionUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const migrateYearUseCase = new MigrateYearUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const reportGenerator = new ReportGenerator();
    const tickerDataRepository = new KnexAssetRepository(database);
    const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(
      knexPositionRepository,
      brokerRepository,
      tickerDataRepository,
      reportGenerator,
    );
    const spreadsheetFileReader = new SheetjsSpreadsheetFileReader();
    const transactionParser = new CsvXlsxTransactionParser(
      spreadsheetFileReader,
      brokerRepository,
    );
    const taxApportioner = new TaxApportioner();
    const previewImportUseCase = new PreviewImportUseCase(transactionParser, taxApportioner);
    const importTransactionsUseCase = new ImportTransactionsUseCase(
      transactionParser,
      taxApportioner,
      knexTransactionRepository,
      recalculatePositionUseCase,
    );
    const xpBroker = await brokerRepository.findByCode('XP');
    if (!xpBroker) {
      throw new Error('Expected broker XP to exist in test database.');
    }

    await knexPositionRepository.save(
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2025,
      }),
    );

    const csvPath = path.join(temporaryDirectory, 'movements.csv');
    await fs.writeFile(
      csvPath,
      [
        'Data;Tipo;Ticker;Quantidade;Preco Unitario;Taxas Totais;Corretora',
        '2025-03-10;Compra;PETR4;10;20;1;XP',
      ].join('\n'),
      'utf-8',
    );

    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: (channel: string, listener: IpcHandler) => {
        handlers.set(channel, listener);
      },
    };

    const dependencies: MainHandlersDependencies = {
      checkHealth: () => ({ status: 'ok' }),
      importSelectFile: () => Promise.resolve({ filePath: null }),
      previewImportTransactions: (input) => previewImportUseCase.execute(input),
      confirmImportTransactions: (input) => importTransactionsUseCase.execute(input),
      setInitialBalance: (input) => setInitialBalanceUseCase.execute(input),
      listPositions: (input) => listPositionsUseCase.execute(input),
      recalculatePosition: (input) => recalculatePositionUseCase.execute(input),
      migrateYear: (input) => migrateYearUseCase.execute(input),
      generateAssetsReport: (input) => generateAssetsReportUseCase.execute(input),
      listBrokers: () => Promise.resolve({ items: [] }),
      createBroker: () =>
        Promise.resolve({
          id: 'broker-1',
          name: 'Test',
          cnpj: '00.000.000/0001-00',
          code: 'TEST',
          active: true,
        }),
      updateBroker: () =>
        Promise.resolve({
          id: 'broker-1',
          name: 'Updated',
          cnpj: '00.000.000/0001-00',
          code: 'TEST',
          active: true,
        }),
      toggleBrokerActive: () =>
        Promise.resolve({
          id: 'broker-1',
          name: 'Test',
          cnpj: '00.000.000/0001-00',
          code: 'TEST',
          active: false,
        }),
      previewConsolidatedPosition: () => Promise.resolve({ rows: [] }),
      importConsolidatedPosition: () =>
        Promise.resolve({ importedCount: 0, recalculatedTickers: [] }),
      deletePosition: () => Promise.resolve({ deleted: false }),
    };

    registerMainHandlers(ipcMain, dependencies);

    const healthHandler = handlers.get('app:health-check');
    const previewHandler = handlers.get('import:preview-transactions');
    const confirmHandler = handlers.get('import:confirm-transactions');
    const setInitialBalanceHandler = handlers.get('portfolio:set-initial-balance');
    const listPositionsHandler = handlers.get('portfolio:list-positions');
    const reportHandler = handlers.get('report:assets-annual');

    if (
      !healthHandler ||
      !previewHandler ||
      !confirmHandler ||
      !setInitialBalanceHandler ||
      !listPositionsHandler ||
      !reportHandler
    ) {
      throw new Error('Some IPC handlers are missing.');
    }

    expect(healthHandler({})).toEqual({ status: 'ok' });

    const previewResult = (await previewHandler({}, {
      filePath: csvPath,
    })) as { transactionsPreview: Array<{ ticker: string }>; batches: Array<{ brokerId: string }> };
    expect(previewResult.transactionsPreview).toHaveLength(1);
    expect(previewResult.batches).toHaveLength(1);
    expect(previewResult.batches[0]?.brokerId).toBeDefined();

    const importResult = (await confirmHandler({}, {
      filePath: csvPath,
    })) as { importedCount: number; recalculatedTickers: string[] };
    expect(importResult).toEqual({
      importedCount: 1,
      recalculatedTickers: ['PETR4'],
    });

    await setInitialBalanceHandler({}, {
      ticker: 'IVVB11',
      brokerId: xpBroker.id.value,
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
      year: 2025,
    });

    const positionsResult = (await listPositionsHandler({}, { baseYear: 2025 })) as {
      items: Array<{ ticker: string }>;
    };
    expect(positionsResult.items.map((item) => item.ticker)).toEqual(
      expect.arrayContaining(['IVVB11']),
    );

    const reportResult = (await reportHandler({}, { baseYear: 2025 })) as {
      referenceDate: string;
      items: Array<{ ticker: string }>;
    };
    expect(reportResult.referenceDate).toBe('2025-12-31');
    expect(reportResult.items.length).toBeGreaterThan(0);
  });

  it('brokers:list, brokers:create, brokers:update, brokers:toggle-active work end-to-end', async () => {
    const brokerRepository = new KnexBrokerRepository(database);
    const createBrokerUseCase = new CreateBrokerUseCase(brokerRepository);
    const updateBrokerUseCase = new UpdateBrokerUseCase(brokerRepository);
    const listBrokersUseCase = new ListBrokersUseCase(brokerRepository);
    const toggleActiveBrokerUseCase = new ToggleActiveBrokerUseCase(brokerRepository);

    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: (channel: string, listener: IpcHandler) => {
        handlers.set(channel, listener);
      },
    };

    const dependencies: MainHandlersDependencies = {
      checkHealth: () => ({ status: 'ok' }),
      importSelectFile: () => Promise.resolve({ filePath: null }),
      previewImportTransactions: () =>
        Promise.resolve({ batches: [], transactionsPreview: [] }),
      confirmImportTransactions: () =>
        Promise.resolve({ importedCount: 0, recalculatedTickers: [] }),
      setInitialBalance: () => Promise.resolve({ ticker: 'IVVB11', brokerId: 'broker-xp', assetType: AssetType.Etf, quantity: 2, averagePrice: 300, year: 2025 }),
      listPositions: () => Promise.resolve({ items: [] }),
      recalculatePosition: () => Promise.resolve(undefined),
      migrateYear: () =>
        Promise.resolve({ migratedPositionsCount: 0, createdTransactionsCount: 0 }),
      generateAssetsReport: () =>
        Promise.resolve({ referenceDate: '2025-12-31', items: [] }),
      listBrokers: (input) => listBrokersUseCase.execute(input),
      createBroker: (input) => createBrokerUseCase.execute(input),
      updateBroker: (input) => updateBrokerUseCase.execute(input),
      toggleBrokerActive: (input) => toggleActiveBrokerUseCase.execute(input),
      previewConsolidatedPosition: () => Promise.resolve({ rows: [] }),
      importConsolidatedPosition: () =>
        Promise.resolve({ importedCount: 0, recalculatedTickers: [] }),
      deletePosition: () => Promise.resolve({ deleted: false }),
    };

    registerMainHandlers(ipcMain, dependencies);

    const listHandler = handlers.get('brokers:list');
    const createHandler = handlers.get('brokers:create');
    const updateHandler = handlers.get('brokers:update');
    const toggleHandler = handlers.get('brokers:toggle-active');

    if (!listHandler || !createHandler || !updateHandler || !toggleHandler) {
      throw new Error('Broker IPC handlers not registered.');
    }

    const initialList = (await listHandler({})) as { items: Array<{ id: string }> };
    expect(initialList.items.length).toBeGreaterThanOrEqual(0);

    const createResult = (await createHandler(
      {},
      { name: 'Test Broker', code: 'TESTBRK', cnpj: '12.345.678/0001-90' },
    )) as { success: boolean; broker?: { id: string; name: string } };
    expect(createResult.success).toBe(true);
    expect(createResult.broker?.name).toBe('Test Broker');

    const brokerId = createResult.broker?.id;
    expect(brokerId).toBeDefined();

    const updateResult = (await updateHandler(
      {},
      { id: brokerId!, name: 'Test Broker Updated' },
    )) as { success: boolean; broker?: { name: string } };
    expect(updateResult.success).toBe(true);
    expect(updateResult.broker?.name).toBe('Test Broker Updated');

    const toggleResult = (await toggleHandler({}, { id: brokerId! })) as {
      success: boolean;
      broker?: { active: boolean };
    };
    expect(toggleResult.success).toBe(true);
    expect(toggleResult.broker?.active).toBe(false);

    const listAll = (await listHandler({})) as { items: Array<{ id: string; active: boolean }> };
    const createdBroker = listAll.items.find((b) => b.id === brokerId);
    expect(createdBroker?.active).toBe(false);

    const listActiveOnly = (await listHandler({}, { activeOnly: true })) as {
      items: Array<{ id: string }>;
    };
    const inActiveList = listActiveOnly.items.find((b) => b.id === brokerId);
    expect(inActiveList).toBeUndefined();
  });
});
