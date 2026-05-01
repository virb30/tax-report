import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import type { Knex } from 'knex';
import {
  AssetType,
  AssetTypeSource,
  SourceType,
  TransactionType,
} from '../../../shared/types/domain';
import { healthCheckContract } from '../../../shared/ipc/contracts/app';
import {
  listAssetsContract,
  repairAssetTypeContract,
  updateAssetContract,
} from '../../../shared/ipc/contracts/assets';
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
  deleteInitialBalanceDocumentContract,
  importConsolidatedPositionContract,
  listInitialBalanceDocumentsContract,
  listPositionsContract,
  previewConsolidatedPositionContract,
  saveInitialBalanceDocumentContract,
} from '../../../shared/ipc/contracts/portfolio';
import { generateAssetsReportContract } from '../../../shared/ipc/contracts/report';
import { CreateBrokerUseCase } from '../../application/use-cases/create-broker/create-broker.use-case';
import { DeleteInitialBalanceDocumentUseCase } from '../../application/use-cases/delete-initial-balance-document/delete-initial-balance-document.use-case';
import { DeletePositionUseCase } from '../../application/use-cases/delete-position/delete-position.use-case';
import { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-asset-report/generate-assets-report.use-case';
import { ImportConsolidatedPositionUseCase } from '../../application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import { ImportTransactionsUseCase } from '../../application/use-cases/import-transactions/import-transactions-use-case';
import { ListAssetsUseCase } from '../../application/use-cases/list-assets/list-assets.use-case';
import { ListBrokersUseCase } from '../../application/use-cases/list-brokers/list-brokers.use-case';
import { ListInitialBalanceDocumentsUseCase } from '../../application/use-cases/list-initial-balance-documents/list-initial-balance-documents.use-case';
import { ListPositionsUseCase } from '../../application/use-cases/list-positions/list-positions-use-case';
import { MigrateYearUseCase } from '../../application/use-cases/migrate-year/migrate-year.use-case';
import { PreviewImportUseCase } from '../../application/use-cases/preview-import/preview-import-use-case';
import { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position/recalculate-position.use-case';
import { RepairAssetTypeUseCase } from '../../application/use-cases/repair-asset-type/repair-asset-type.use-case';
import { SaveInitialBalanceDocumentUseCase } from '../../application/use-cases/save-initial-balance-document/save-initial-balance-document.use-case';
import { ToggleActiveBrokerUseCase } from '../../application/use-cases/toggle-active-broker/toggle-active-broker.use-case';
import { UpdateAssetUseCase } from '../../application/use-cases/update-asset/update-asset.use-case';
import { UpdateBrokerUseCase } from '../../application/use-cases/update-broker/update-broker.use-case';
import { InitialBalanceDocumentPositionSyncService } from '../../application/services/initial-balance-document-position-sync.service';
import { ReprocessTickerYearsService } from '../../application/services/reprocess-ticker-years.service';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { TaxApportioner } from '../../domain/ingestion/tax-apportioner.service';
import { Asset } from '../../domain/portfolio/entities/asset.entity';
import { AssetPosition } from '../../domain/portfolio/entities/asset-position.entity';
import { Broker } from '../../domain/portfolio/entities/broker.entity';
import { Transaction } from '../../domain/portfolio/entities/transaction.entity';
import { Cnpj } from '../../domain/shared/cnpj.vo';
import { Money } from '../../domain/portfolio/value-objects/money.vo';
import { Quantity } from '../../domain/portfolio/value-objects/quantity.vo';
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

  it('runs transaction preview, confirm, initial balance document, list and report channels end-to-end', async () => {
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
      tickerDataRepository,
    );
    const listInitialBalanceDocumentsUseCase = new ListInitialBalanceDocumentsUseCase(
      knexTransactionRepository,
      knexPositionRepository,
      tickerDataRepository,
    );
    const deleteInitialBalanceDocumentUseCase = new DeleteInitialBalanceDocumentUseCase(
      knexTransactionRepository,
      positionSyncService,
    );
    const listPositionsUseCase = new ListPositionsUseCase(
      knexPositionRepository,
      brokerRepository,
      tickerDataRepository,
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
    const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(
      knexPositionRepository,
      brokerRepository,
      tickerDataRepository,
      knexTransactionRepository,
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
      tickerDataRepository,
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
      saveInitialBalanceDocumentUseCase,
      listInitialBalanceDocumentsUseCase,
      deleteInitialBalanceDocumentUseCase,
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
    const saveInitialBalanceDocumentHandler = handlers.get(
      saveInitialBalanceDocumentContract.channel,
    );
    const listInitialBalanceDocumentsHandler = handlers.get(
      listInitialBalanceDocumentsContract.channel,
    );
    const deleteInitialBalanceDocumentHandler = handlers.get(
      deleteInitialBalanceDocumentContract.channel,
    );
    const listPositionsHandler = handlers.get(listPositionsContract.channel);
    const reportHandler = handlers.get(generateAssetsReportContract.channel);

    if (
      !healthHandler ||
      !previewHandler ||
      !confirmHandler ||
      !saveInitialBalanceDocumentHandler ||
      !listInitialBalanceDocumentsHandler ||
      !deleteInitialBalanceDocumentHandler ||
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
      assetTypeOverrides: [{ ticker: 'PETR4', assetType: AssetType.Stock }],
    })) as {
      importedCount: number;
      recalculatedTickers: string[];
      skippedUnsupportedRows: number;
    };
    expect(importResult).toEqual({
      importedCount: 1,
      recalculatedTickers: ['PETR4'],
      skippedUnsupportedRows: 0,
    });
    await expect(tickerDataRepository.findByTicker('PETR4')).resolves.toEqual(
      expect.objectContaining({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.Manual,
      }),
    );

    await saveInitialBalanceDocumentHandler(ipcEvent, {
      ticker: 'IVVB11',
      year: 2025,
      assetType: AssetType.Etf,
      name: 'iShares Core S&P 500',
      cnpj: '11.111.111/0001-11',
      averagePrice: '300',
      allocations: [{ brokerId: xpBroker.id.value, quantity: '2' }],
    });

    const documentsResult = (await listInitialBalanceDocumentsHandler(ipcEvent, {
      year: 2025,
    })) as {
      ok: true;
      data: {
        items: Array<{
          ticker: string;
          name: string | null;
          cnpj: string | null;
          allocations: Array<{ brokerId: string; quantity: string }>;
        }>;
      };
    };
    expect(documentsResult.data.items).toEqual([
      {
        ticker: 'IVVB11',
        year: 2025,
        assetType: AssetType.Etf,
        name: 'iShares Core S&P 500',
        cnpj: '11.111.111/0001-11',
        averagePrice: '300',
        allocations: [{ brokerId: xpBroker.id.value, quantity: '2' }],
        totalQuantity: '2',
      },
    ]);
    await expect(tickerDataRepository.findByTicker('IVVB11')).resolves.toEqual(
      expect.objectContaining({
        ticker: 'IVVB11',
        assetType: AssetType.Etf,
        resolutionSource: AssetTypeSource.Manual,
        name: 'iShares Core S&P 500',
        issuerCnpj: '11.111.111/0001-11',
      }),
    );

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
      items: Array<{ ticker: string; status: string; currentYearValue: number }>;
    };
    expect(reportResult.referenceDate).toBe('2025-12-31');
    expect(reportResult.items.length).toBeGreaterThan(0);
    expect(reportResult.items[0]).toEqual(
      expect.objectContaining({
        status: expect.any(String),
        currentYearValue: expect.any(Number),
      }),
    );

    await expect(
      deleteInitialBalanceDocumentHandler(ipcEvent, { ticker: 'IVVB11', year: 2025 }),
    ).resolves.toEqual({
      ok: true,
      data: { deleted: true },
    });
  });

  it('runs consolidated preview and confirm through IPC while skipping unsupported rows', async () => {
    const brokerRepository = new KnexBrokerRepository(database);
    const knexPositionRepository = new KnexPositionRepository(database);
    const knexTransactionRepository = new KnexTransactionRepository(database);
    const tickerDataRepository = new KnexAssetRepository(database);
    const recalculatePositionUseCase = new RecalculatePositionUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const queue = new MemoryQueueAdapter();
    new RecalculatePositionHandler(queue, recalculatePositionUseCase);
    const importConsolidatedPositionUseCase = new ImportConsolidatedPositionUseCase(
      new CsvXlsxConsolidatedPositionParser(),
      tickerDataRepository,
      brokerRepository,
      knexTransactionRepository,
      queue,
    );
    const positionSyncService = new InitialBalanceDocumentPositionSyncService(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const portfolioRegistrar = new PortfolioIpcRegistrar(
      new SaveInitialBalanceDocumentUseCase(
        knexTransactionRepository,
        positionSyncService,
        tickerDataRepository,
      ),
      new ListInitialBalanceDocumentsUseCase(
        knexTransactionRepository,
        knexPositionRepository,
        tickerDataRepository,
      ),
      new DeleteInitialBalanceDocumentUseCase(knexTransactionRepository, positionSyncService),
      new ListPositionsUseCase(knexPositionRepository, brokerRepository, tickerDataRepository),
      recalculatePositionUseCase,
      new MigrateYearUseCase(knexPositionRepository, knexTransactionRepository),
      importConsolidatedPositionUseCase,
      new DeletePositionUseCase(knexPositionRepository, knexTransactionRepository),
    );

    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel: string, listener: IpcHandler) => {
        handlers.set(channel, listener);
      },
    };
    portfolioRegistrar.register(ipcMain);

    const previewHandler = handlers.get(previewConsolidatedPositionContract.channel);
    const importHandler = handlers.get(importConsolidatedPositionContract.channel);
    if (!previewHandler || !importHandler) {
      throw new Error('Consolidated position IPC handlers are missing.');
    }

    const csvPath = path.join(temporaryDirectory, 'positions.csv');
    await fs.writeFile(
      csvPath,
      [
        'Ticker;Quantidade;Preco Medio;Corretora;Tipo Ativo',
        'PETR4;100;25.50;XP;Acao',
        'BTC11;1;100;XP;Cripto',
      ].join('\n'),
      'utf-8',
    );

    const previewResult = (await previewHandler(ipcEvent, {
      filePath: csvPath,
    })) as {
      ok: true;
      data: {
        summary: { supportedRows: number; pendingRows: number; unsupportedRows: number };
      };
    };
    expect(previewResult.data.summary).toEqual({
      supportedRows: 1,
      pendingRows: 0,
      unsupportedRows: 1,
    });

    const importResult = (await importHandler(ipcEvent, {
      filePath: csvPath,
      year: 2025,
      assetTypeOverrides: [],
    })) as {
      ok: true;
      data: {
        importedCount: number;
        recalculatedTickers: string[];
        skippedUnsupportedRows: number;
      };
    };
    expect(importResult.data).toEqual({
      importedCount: 1,
      recalculatedTickers: ['PETR4'],
      skippedUnsupportedRows: 1,
    });
    await expect(tickerDataRepository.findByTicker('PETR4')).resolves.toEqual(
      expect.objectContaining({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.File,
      }),
    );
    await expect(tickerDataRepository.findByTicker('BTC11')).resolves.toBeNull();
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

  it('assets:list, assets:update, and assets:repair-type work end-to-end', async () => {
    const assetRepository = new KnexAssetRepository(database);
    const listAssetsUseCase = new ListAssetsUseCase(assetRepository);
    const updateAssetUseCase = new UpdateAssetUseCase(assetRepository);
    const brokerRepository = new KnexBrokerRepository(database);
    const positionRepository = new KnexPositionRepository(database);
    const transactionRepository = new KnexTransactionRepository(database);
    const recalculatePositionUseCase = new RecalculatePositionUseCase(
      positionRepository,
      transactionRepository,
    );
    const repairAssetTypeUseCase = new RepairAssetTypeUseCase(
      assetRepository,
      transactionRepository,
      new ReprocessTickerYearsService(recalculatePositionUseCase),
    );
    const repairBroker = Broker.create({
      name: 'Repair Broker',
      cnpj: new Cnpj('44.444.444/0001-44'),
      code: 'RPR2',
    });
    await brokerRepository.save(repairBroker);

    await assetRepository.save(
      Asset.create({
        ticker: 'HGLG11',
        assetType: AssetType.Fii,
        resolutionSource: AssetTypeSource.File,
      }),
    );
    await transactionRepository.saveMany([
      Transaction.create({
        date: '2024-01-10',
        type: TransactionType.Buy,
        ticker: 'HGLG11',
        quantity: Quantity.from(1),
        unitPrice: Money.from(100),
        fees: Money.from(0),
        brokerId: repairBroker.id,
        sourceType: SourceType.Csv,
      }),
      Transaction.create({
        date: '2025-01-10',
        type: TransactionType.Buy,
        ticker: 'HGLG11',
        quantity: Quantity.from(1),
        unitPrice: Money.from(100),
        fees: Money.from(0),
        brokerId: repairBroker.id,
        sourceType: SourceType.Csv,
      }),
    ]);
    await positionRepository.save(
      AssetPosition.create({
        ticker: 'HGLG11',
        assetType: AssetType.Fii,
        year: 2024,
      }),
    );
    await positionRepository.save(
      AssetPosition.create({
        ticker: 'HGLG11',
        assetType: AssetType.Fii,
        year: 2025,
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

    const assetsRegistrar = new AssetsIpcRegistrar(
      listAssetsUseCase,
      updateAssetUseCase,
      repairAssetTypeUseCase,
    );
    assetsRegistrar.register(ipcMain);

    const listHandler = handlers.get(listAssetsContract.channel);
    const updateHandler = handlers.get(updateAssetContract.channel);
    const repairHandler = handlers.get(repairAssetTypeContract.channel);

    if (!listHandler || !updateHandler || !repairHandler) {
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

    const repairResult = (await repairHandler(ipcEvent, {
      ticker: 'HGLG11',
      assetType: AssetType.Etf,
    })) as {
      success: boolean;
      repair?: {
        ticker: string;
        assetType: AssetType;
        affectedYears: number[];
        reprocessedCount: number;
      };
    };
    expect(repairResult).toEqual({
      success: true,
      repair: {
        ticker: 'HGLG11',
        assetType: AssetType.Etf,
        affectedYears: [2024, 2025],
        reprocessedCount: 2,
      },
    });

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
