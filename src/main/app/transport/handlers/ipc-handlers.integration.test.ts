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
import { healthCheckContract } from '../../../../ipc/contracts/app';
import {
  listAssetsContract,
  repairAssetTypeContract,
  updateAssetContract,
} from '../../../../ipc/contracts/portfolio/assets';
import {
  createBrokerContract,
  listBrokersContract,
  toggleBrokerActiveContract,
  updateBrokerContract,
} from '../../../../ipc/contracts/portfolio/brokers';
import {
  confirmImportTransactionsContract,
  importDailyBrokerTaxesContract,
  previewImportTransactionsContract,
} from '../../../../ipc/contracts/ingestion/import';
import {
  deleteInitialBalanceDocumentContract,
  importConsolidatedPositionContract,
  listInitialBalanceDocumentsContract,
  listPositionsContract,
  previewConsolidatedPositionContract,
  saveInitialBalanceDocumentContract,
} from '../../../../ipc/contracts/portfolio/portfolio';
import { generateAssetsReportContract } from '../../../../ipc/contracts/tax-reporting/report';
import { createAppModule } from '../../infra/container/app-module';
import { createDatabaseConnection, initializeDatabase } from '../../infra/database/database';
import { TransactionFeeAllocator } from '../../../portfolio/domain/services/transaction-fee-allocator.service';
import { Asset } from '../../../portfolio/domain/entities/asset.entity';
import { AssetPosition } from '../../../portfolio/domain/entities/asset-position.entity';
import { Broker } from '../../../portfolio/domain/entities/broker.entity';
import { Transaction } from '../../../portfolio/domain/entities/transaction.entity';
import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';
import { Quantity } from '../../../portfolio/domain/value-objects/quantity.vo';
import { createIngestionModule } from '../../../ingestion/infra/container';
import { createPortfolioModule } from '../../../portfolio/infra/container';
import { MemoryQueueAdapter } from '../../../shared/infra/events/memory-queue.adapter';
import { createTaxReportingModule } from '../../../tax-reporting/infra/container';

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
    const queue = new MemoryQueueAdapter();
    const transactionFeeAllocator = new TransactionFeeAllocator();
    const shared = { database, queue, transactionFeeAllocator };
    const appModule = createAppModule();
    const portfolioModule = createPortfolioModule(shared);
    portfolioModule.startup?.initialize();
    const ingestionModule = createIngestionModule({
      shared,
      portfolio: portfolioModule.exports,
    });
    const taxReportingModule = createTaxReportingModule({
      portfolio: portfolioModule.exports,
    });
    const brokerRepository = portfolioModule.exports.brokerRepository;
    const knexPositionRepository = portfolioModule.exports.positionRepository;
    const knexTransactionRepository = portfolioModule.exports.transactionRepository;
    const tickerDataRepository = portfolioModule.exports.assetRepository;

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
        'Data;Entrada/Saída;Movimentação;Ticker;Quantidade;Preco Unitario;Corretora',
        '2025-03-10;Crédito;Transferência - Liquidação;PETR4;10;20;XP',
      ].join('\n'),
      'utf-8',
    );

    const taxesCsvPath = path.join(temporaryDirectory, 'daily-taxes.csv');
    await fs.writeFile(
      taxesCsvPath,
      ['Data;Corretora;Taxas;IRRF', '2025-03-10;XP;1;0,01'].join('\n'),
      'utf-8',
    );

    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel: string, listener: IpcHandler) => {
        handlers.set(channel, listener);
      },
    };

    appModule.registerIpc(ipcMain);
    ingestionModule.registerIpc(ipcMain);
    portfolioModule.registerIpc(ipcMain);
    taxReportingModule.registerIpc(ipcMain);

    const healthHandler = handlers.get(healthCheckContract.channel);
    const importDailyBrokerTaxesHandler = handlers.get(importDailyBrokerTaxesContract.channel);
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
      !importDailyBrokerTaxesHandler ||
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

    await expect(
      importDailyBrokerTaxesHandler(ipcEvent, {
        filePath: taxesCsvPath,
      }),
    ).resolves.toEqual({
      importedCount: 1,
      recalculatedTickers: [],
    });

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
    await expect(
      knexTransactionRepository.findByDateAndBroker({
        date: '2025-03-10',
        brokerId: xpBroker.id.value,
      }),
    ).resolves.toEqual([expect.objectContaining({ feesAmount: '1' })]);
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
    const queue = new MemoryQueueAdapter();
    const portfolioModule = createPortfolioModule({
      database,
      queue,
      transactionFeeAllocator: new TransactionFeeAllocator(),
    });
    portfolioModule.startup?.initialize();
    const tickerDataRepository = portfolioModule.exports.assetRepository;

    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel: string, listener: IpcHandler) => {
        handlers.set(channel, listener);
      },
    };
    portfolioModule.registerIpc(ipcMain);

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
    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel: string, listener: IpcHandler) => {
        handlers.set(channel, listener);
      },
    };
    const portfolioModule = createPortfolioModule({
      database,
      queue: new MemoryQueueAdapter(),
      transactionFeeAllocator: new TransactionFeeAllocator(),
    });
    portfolioModule.registerIpc(ipcMain);

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
    const portfolioModule = createPortfolioModule({
      database,
      queue: new MemoryQueueAdapter(),
      transactionFeeAllocator: new TransactionFeeAllocator(),
    });
    const assetRepository = portfolioModule.exports.assetRepository;
    const brokerRepository = portfolioModule.exports.brokerRepository;
    const positionRepository = portfolioModule.exports.positionRepository;
    const transactionRepository = portfolioModule.exports.transactionRepository;
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

    portfolioModule.registerIpc(ipcMain);

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
