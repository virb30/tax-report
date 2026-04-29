import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import type { Knex } from 'knex';
import { AssetType, AssetTypeSource } from '../../../shared/types/domain';
import { healthCheckContract } from '../../../shared/ipc/contracts/app';
import { listAssetsContract, updateAssetContract } from '../../../shared/ipc/contracts/assets';
import {
  createBrokerContract,
  listBrokersContract,
  toggleBrokerActiveContract,
  updateBrokerContract,
} from '../../../shared/ipc/contracts/brokers';
import {
  confirmImportTransactionsContract,
  previewImportTransactionsContract,
} from '../../../shared/ipc/contracts/import';
import {
  listPositionsContract,
  setInitialBalanceContract,
} from '../../../shared/ipc/contracts/portfolio';
import { generateAssetsReportContract } from '../../../shared/ipc/contracts/report';
import { CreateBrokerUseCase } from '../../application/use-cases/create-broker/create-broker.use-case';
import { DeletePositionUseCase } from '../../application/use-cases/delete-position/delete-position.use-case';
import { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-asset-report/generate-assets-report.use-case';
import { ImportConsolidatedPositionUseCase } from '../../application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import { ImportTransactionsUseCase } from '../../application/use-cases/import-transactions/import-transactions-use-case';
import { ListAssetsUseCase } from '../../application/use-cases/list-assets/list-assets.use-case';
import { ListBrokersUseCase } from '../../application/use-cases/list-brokers/list-brokers.use-case';
import { ListPositionsUseCase } from '../../application/use-cases/list-positions/list-positions-use-case';
import { MigrateYearUseCase } from '../../application/use-cases/migrate-year/migrate-year.use-case';
import { PreviewImportUseCase } from '../../application/use-cases/preview-import/preview-import-use-case';
import { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position/recalculate-position.use-case';
import { SetInitialBalanceUseCase } from '../../application/use-cases/set-initial-balance/set-initial-balance.use-case';
import { ToggleActiveBrokerUseCase } from '../../application/use-cases/toggle-active-broker/toggle-active-broker.use-case';
import { UpdateAssetUseCase } from '../../application/use-cases/update-asset/update-asset.use-case';
import { UpdateBrokerUseCase } from '../../application/use-cases/update-broker/update-broker.use-case';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { TaxApportioner } from '../../domain/ingestion/tax-apportioner.service';
import { Asset } from '../../domain/portfolio/entities/asset.entity';
import { AssetPosition } from '../../domain/portfolio/entities/asset-position.entity';
import { Cnpj } from '../../domain/shared/cnpj.vo';
import { SheetjsSpreadsheetFileReader } from '../../infrastructure/adapters/file-readers/sheetjs.spreadsheet.file-reader';
import { BrokersIpcRegistrar } from '../registrars/brokers-ipc-registrar';
import { AssetsIpcRegistrar } from '../registrars/assets-ipc-registrar';
import { AppIpcRegistrar } from '../registrars/app-ipc-registrar';
import { ImportIpcRegistrar } from '../registrars/import-ipc-registrar';
import { PortfolioIpcRegistrar } from '../registrars/portfolio-ipc-registrar';
import { ReportIpcRegistrar } from '../registrars/report-ipc-registrar';
import { KnexPositionRepository } from '../../infrastructure/repositories/knex-position.repository';
import { KnexTransactionRepository } from '../../infrastructure/repositories/knex-transaction.repository';
import { KnexBrokerRepository } from '../../infrastructure/repositories/knex-broker.repository';
import { KnexAssetRepository } from '../../infrastructure/repositories/knex-asset.repository';
import { CsvXlsxTransactionParser } from '../../infrastructure/parsers/csv-xlsx-transaction.parser';
import { MemoryQueueAdapter } from '../../infrastructure/events/memory-queue.adapter';
import { RecalculatePositionHandler } from '../../infrastructure/handlers/recalculate-position.handler';
import { CsvXlsxConsolidatedPositionParser } from '../../infrastructure/parsers/csv-xlsx-consolidated-position.parser';

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
    const listPositionsUseCase = new ListPositionsUseCase(knexPositionRepository, brokerRepository);
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
    const transactionParser = new CsvXlsxTransactionParser(spreadsheetFileReader, brokerRepository);
    const consolidatedPositionParser = new CsvXlsxConsolidatedPositionParser();
    const taxApportioner = new TaxApportioner();
    const previewImportUseCase = new PreviewImportUseCase(
      transactionParser,
      taxApportioner,
      tickerDataRepository,
    );
    const importTransactionsUseCase = new ImportTransactionsUseCase(
      transactionParser,
      taxApportioner,
      knexTransactionRepository,
      queue,
    );
    const importConsolidatedPositionUseCase = new ImportConsolidatedPositionUseCase(
      consolidatedPositionParser,
      tickerDataRepository,
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

    const appRegistrar = new AppIpcRegistrar();
    const importRegistrar = new ImportIpcRegistrar(previewImportUseCase, importTransactionsUseCase);
    const portfolioRegistrar = new PortfolioIpcRegistrar(
      setInitialBalanceUseCase,
      listPositionsUseCase,
      recalculatePositionUseCase,
      migrateYearUseCase,
      importConsolidatedPositionUseCase,
      deletePositionUseCase,
    );
    const reportRegistrar = new ReportIpcRegistrar(generateAssetsReportUseCase);

    appRegistrar.register(ipcMain);
    importRegistrar.register(ipcMain);
    portfolioRegistrar.register(ipcMain);
    reportRegistrar.register(ipcMain);

    const healthHandler = handlers.get(healthCheckContract.channel);
    const previewHandler = handlers.get(previewImportTransactionsContract.channel);
    const confirmHandler = handlers.get(confirmImportTransactionsContract.channel);
    const setInitialBalanceHandler = handlers.get(setInitialBalanceContract.channel);
    const listPositionsHandler = handlers.get(listPositionsContract.channel);
    const reportHandler = handlers.get(generateAssetsReportContract.channel);

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
    })) as {
      transactionsPreview: Array<{ ticker: string; resolutionStatus: string }>;
      batches: Array<{ brokerId: string }>;
      summary: { supportedRows: number; pendingRows: number; unsupportedRows: number };
    };
    expect(previewResult.transactionsPreview).toHaveLength(1);
    expect(previewResult.batches).toHaveLength(1);
    expect(previewResult.batches[0]?.brokerId).toBeDefined();
    expect(previewResult.transactionsPreview[0]?.resolutionStatus).toBe('unresolved');
    expect(previewResult.summary).toEqual({
      supportedRows: 1,
      pendingRows: 1,
      unsupportedRows: 0,
    });

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
      ok: true;
      data: {
        items: Array<{ ticker: string }>;
      };
    };
    expect(positionsResult.data.items.map((item) => item.ticker)).toEqual(
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

    const brokersRegistrar = new BrokersIpcRegistrar(
      listBrokersUseCase,
      createBrokerUseCase,
      updateBrokerUseCase,
      toggleActiveBrokerUseCase,
    );
    brokersRegistrar.register(ipcMain);

    const listHandler = handlers.get(listBrokersContract.channel);
    const createHandler = handlers.get(createBrokerContract.channel);
    const updateHandler = handlers.get(updateBrokerContract.channel);
    const toggleHandler = handlers.get(toggleBrokerActiveContract.channel);

    if (!listHandler || !createHandler || !updateHandler || !toggleHandler) {
      throw new Error('Broker IPC handlers not registered.');
    }

    const initialList = (await listHandler(ipcEvent)) as { items: Array<{ id: string }> };
    expect(initialList.items.length).toBeGreaterThanOrEqual(0);

    const createResult = (await createHandler(ipcEvent, {
      name: 'Test Broker',
      code: 'TESTBRK',
      cnpj: '12.345.678/0001-90',
    })) as { success: boolean; broker?: { id: string; name: string } };
    expect(createResult.success).toBe(true);
    expect(createResult.broker?.name).toBe('Test Broker');

    const brokerId = createResult.broker?.id;
    expect(brokerId).toBeDefined();

    const updateResult = (await updateHandler(ipcEvent, {
      id: brokerId!,
      name: 'Test Broker Updated',
    })) as { success: boolean; broker?: { name: string } };
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

  it('assets:list and assets:update work end-to-end', async () => {
    const assetRepository = new KnexAssetRepository(database);
    const listAssetsUseCase = new ListAssetsUseCase(assetRepository);
    const updateAssetUseCase = new UpdateAssetUseCase(assetRepository);

    await assetRepository.save(
      Asset.create({
        ticker: 'HGLG11',
        assetType: AssetType.Fii,
        resolutionSource: AssetTypeSource.File,
      }),
    );
    await assetRepository.save(
      Asset.create({
        ticker: 'VALE3',
        issuerCnpj: new Cnpj('33.592.510/0001-54'),
        name: 'Vale',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.File,
      }),
    );

    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel: string, listener: IpcHandler) => {
        handlers.set(channel, listener);
      },
    };

    const assetsRegistrar = new AssetsIpcRegistrar(listAssetsUseCase, updateAssetUseCase);
    assetsRegistrar.register(ipcMain);

    const listHandler = handlers.get(listAssetsContract.channel);
    const updateHandler = handlers.get(updateAssetContract.channel);

    if (!listHandler || !updateHandler) {
      throw new Error('Asset IPC handlers not registered.');
    }

    const pendingOnlyResult = (await listHandler(ipcEvent, { pendingOnly: true })) as {
      items: Array<{ ticker: string }>;
    };
    expect(pendingOnlyResult.items.map((item) => item.ticker)).toEqual(['HGLG11']);

    const updateResult = (await updateHandler(ipcEvent, {
      ticker: 'HGLG11',
      name: 'CSHG Logistica',
      cnpj: '03.837.735/0001-17',
    })) as {
      success: boolean;
      asset?: {
        ticker: string;
        assetType: AssetType;
        resolutionSource: AssetTypeSource;
        name: string;
        cnpj: string;
        isReportReadyMetadata: boolean;
      };
    };
    expect(updateResult.success).toBe(true);
    expect(updateResult.asset).toEqual({
      ticker: 'HGLG11',
      assetType: AssetType.Fii,
      resolutionSource: AssetTypeSource.File,
      name: 'CSHG Logistica',
      cnpj: '03.837.735/0001-17',
      isReportReadyMetadata: true,
    });

    const reportBlockingResult = (await listHandler(ipcEvent, {
      reportBlockingOnly: true,
    })) as { items: Array<{ ticker: string }> };
    expect(reportBlockingResult.items).toEqual([]);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const invalidUpdate = (await updateHandler(ipcEvent, {
      ticker: '',
      name: 'Invalid',
    })) as { success: boolean; error?: string };
    consoleErrorSpy.mockRestore();

    expect(invalidUpdate).toEqual({
      success: false,
      error: 'Invalid ticker for update asset.',
    });
  });
});
