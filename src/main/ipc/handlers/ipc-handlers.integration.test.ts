import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { AssetType } from '../../../shared/types/domain';
import { BrokersController } from '../controllers/brokers.controller';
import { AppController } from '../controllers/app.controller';
import { ImportController } from '../controllers/import.controller';
import { PortfolioController } from '../controllers/portfolio.controller';
import { ReportController } from '../controllers/report.controller';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { SetInitialBalanceUseCase } from '../../application/use-cases/set-initial-balance/set-initial-balance.use-case';
import { ListPositionsUseCase } from '../../application/use-cases/list-positions/list-positions-use-case';
import { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position/recalculate-position.use-case';
import { MigrateYearUseCase } from '../../application/use-cases/migrate-year/migrate-year.use-case';
import { KnexPositionRepository } from '../../infrastructure/repositories/knex-position.repository';
import { KnexTransactionRepository } from '../../infrastructure/repositories/knex-transaction.repository';
import { KnexBrokerRepository } from '../../infrastructure/repositories/knex-broker.repository';
import { KnexAssetRepository } from '../../infrastructure/repositories/knex-asset.repository';
import { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-asset-report/generate-assets-report.use-case';
import { TaxApportioner } from '../../domain/ingestion/tax-apportioner.service';
import { CsvXlsxTransactionParser } from '../../infrastructure/parsers/csv-xlsx-transaction.parser';
import { SheetjsSpreadsheetFileReader } from '../../infrastructure/adapters/file-readers/sheetjs.spreadsheet.file-reader';
import { PreviewImportUseCase } from '../../application/use-cases/preview-import/preview-import-use-case';
import { ImportTransactionsUseCase } from '../../application/use-cases/import-transactions/import-transactions-use-case';
import { AssetPosition } from '../../domain/portfolio/entities/asset-position.entity';
import { CreateBrokerUseCase } from '../../application/use-cases/create-broker/create-broker.use-case';
import { UpdateBrokerUseCase } from '../../application/use-cases/update-broker/update-broker.use-case';
import { ListBrokersUseCase } from '../../application/use-cases/list-brokers/list-brokers.use-case';
import { ToggleActiveBrokerUseCase } from '../../application/use-cases/toggle-active-broker/toggle-active-broker.use-case';
import { MemoryQueueAdapter } from '../../infrastructure/events/memory-queue.adapter';
import { RecalculatePositionHandler } from '../../infrastructure/handlers/recalculate-position.handler';
import { ImportConsolidatedPositionUseCase } from '../../application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import { DeletePositionUseCase } from '../../application/use-cases/delete-position/delete-position.use-case';
import { CsvXlsxConsolidatedPositionParser } from '../../infrastructure/parsers/csv-xlsx-consolidated-position.parser';
import {
  APP_IPC_CHANNELS,
  BROKERS_IPC_CHANNELS,
  IMPORT_IPC_CHANNELS,
  PORTFOLIO_IPC_CHANNELS,
  REPORT_IPC_CHANNELS,
} from '../../../shared/ipc/ipc-channels';

type IpcHandler = (_event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown;
type IpcMainHandleRegistry = Pick<Electron.IpcMain, 'handle'>;

describe('IPC handlers integration', () => {
  let database: Knex;
  let temporaryDirectory: string;
  const ipcEvent = {} as Electron.IpcMainInvokeEvent;

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
    const queue = new MemoryQueueAdapter();
    new RecalculatePositionHandler(queue, recalculatePositionUseCase);
    const migrateYearUseCase = new MigrateYearUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const tickerDataRepository = new KnexAssetRepository(database);
    const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(
      knexPositionRepository,
      brokerRepository,
      tickerDataRepository,
    );
    const spreadsheetFileReader = new SheetjsSpreadsheetFileReader();
    const transactionParser = new CsvXlsxTransactionParser(
      spreadsheetFileReader,
      brokerRepository,
    );
    const consolidatedPositionParser = new CsvXlsxConsolidatedPositionParser();
    const taxApportioner = new TaxApportioner();
    const previewImportUseCase = new PreviewImportUseCase(transactionParser, taxApportioner);
    const importTransactionsUseCase = new ImportTransactionsUseCase(
      transactionParser,
      taxApportioner,
      knexTransactionRepository,
      queue,
    );
    const importConsolidatedPositionUseCase = new ImportConsolidatedPositionUseCase(
      consolidatedPositionParser,
      brokerRepository,
      knexTransactionRepository,
      queue,
    );
    const deletePositionUseCase = new DeletePositionUseCase(
      knexPositionRepository,
      knexTransactionRepository,
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
        'Data;Entrada/Saída;Movimentação;Ticker;Quantidade;Preco Unitario;Taxas Totais;Corretora',
        '2025-03-10;Crédito;Transferência - Liquidação;PETR4;10;20;1;XP',
      ].join('\n'),
      'utf-8',
    );

    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel: string, listener: IpcHandler) => {
        handlers.set(channel, listener);
      },
    };

    const appController = new AppController();
    const importController = new ImportController(previewImportUseCase, importTransactionsUseCase);
    const portfolioController = new PortfolioController(
      setInitialBalanceUseCase,
      listPositionsUseCase,
      recalculatePositionUseCase,
      migrateYearUseCase,
      importConsolidatedPositionUseCase,
      deletePositionUseCase,
    );
    const reportController = new ReportController(generateAssetsReportUseCase);

    appController.register(ipcMain);
    importController.register(ipcMain);
    portfolioController.register(ipcMain);
    reportController.register(ipcMain);

    const healthHandler = handlers.get(APP_IPC_CHANNELS.healthCheck);
    const previewHandler = handlers.get(IMPORT_IPC_CHANNELS.previewTransactions);
    const confirmHandler = handlers.get(IMPORT_IPC_CHANNELS.confirmTransactions);
    const setInitialBalanceHandler = handlers.get(PORTFOLIO_IPC_CHANNELS.setInitialBalance);
    const listPositionsHandler = handlers.get(PORTFOLIO_IPC_CHANNELS.listPositions);
    const reportHandler = handlers.get(REPORT_IPC_CHANNELS.assetsAnnual);

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

    expect(await healthHandler(ipcEvent)).toEqual({ status: 'ok' });

    const previewResult = (await previewHandler(ipcEvent, {
      filePath: csvPath,
    })) as { transactionsPreview: Array<{ ticker: string }>; batches: Array<{ brokerId: string }> };
    expect(previewResult.transactionsPreview).toHaveLength(1);
    expect(previewResult.batches).toHaveLength(1);
    expect(previewResult.batches[0]?.brokerId).toBeDefined();

    const importResult = (await confirmHandler(ipcEvent, {
      filePath: csvPath,
    })) as { importedCount: number; recalculatedTickers: string[] };
    expect(importResult).toEqual({
      importedCount: 1,
      recalculatedTickers: ['PETR4'],
    });

    await setInitialBalanceHandler(ipcEvent, {
      ticker: 'IVVB11',
      brokerId: xpBroker.id.value,
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
      year: 2025,
    });

    const positionsResult = (await listPositionsHandler(ipcEvent, { baseYear: 2025 })) as {
      items: Array<{ ticker: string }>;
    };
    expect(positionsResult.items.map((item) => item.ticker)).toEqual(
      expect.arrayContaining(['IVVB11']),
    );

    const reportResult = (await reportHandler(ipcEvent, { baseYear: 2025 })) as {
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
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel: string, listener: IpcHandler) => {
        handlers.set(channel, listener);
      },
    };

    const brokersController = new BrokersController(
      listBrokersUseCase,
      createBrokerUseCase,
      updateBrokerUseCase,
      toggleActiveBrokerUseCase,
    );
    brokersController.register(ipcMain);

    const listHandler = handlers.get(BROKERS_IPC_CHANNELS.list);
    const createHandler = handlers.get(BROKERS_IPC_CHANNELS.create);
    const updateHandler = handlers.get(BROKERS_IPC_CHANNELS.update);
    const toggleHandler = handlers.get(BROKERS_IPC_CHANNELS.toggleActive);

    if (!listHandler || !createHandler || !updateHandler || !toggleHandler) {
      throw new Error('Broker IPC handlers not registered.');
    }

    const initialList = (await listHandler(ipcEvent)) as { items: Array<{ id: string }> };
    expect(initialList.items.length).toBeGreaterThanOrEqual(0);

    const createResult = (await createHandler(
      ipcEvent,
      { name: 'Test Broker', code: 'TESTBRK', cnpj: '12.345.678/0001-90' },
    )) as { success: boolean; broker?: { id: string; name: string } };
    expect(createResult.success).toBe(true);
    expect(createResult.broker?.name).toBe('Test Broker');

    const brokerId = createResult.broker?.id;
    expect(brokerId).toBeDefined();

    const updateResult = (await updateHandler(
      ipcEvent,
      { id: brokerId!, name: 'Test Broker Updated' },
    )) as { success: boolean; broker?: { name: string } };
    expect(updateResult.success).toBe(true);
    expect(updateResult.broker?.name).toBe('Test Broker Updated');

    const toggleResult = (await toggleHandler(ipcEvent, { id: brokerId! })) as {
      success: boolean;
      broker?: { active: boolean };
    };
    expect(toggleResult.success).toBe(true);
    expect(toggleResult.broker?.active).toBe(false);

    const listAll = (await listHandler(ipcEvent)) as {
      items: Array<{ id: string; active: boolean }>;
    };
    const createdBroker = listAll.items.find((b) => b.id === brokerId);
    expect(createdBroker?.active).toBe(false);

    const listActiveOnly = (await listHandler(ipcEvent, { activeOnly: true })) as {
      items: Array<{ id: string }>;
    };
    const inActiveList = listActiveOnly.items.find((b) => b.id === brokerId);
    expect(inActiveList).toBeUndefined();
  });
});
