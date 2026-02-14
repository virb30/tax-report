import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { AssetType, SourceType } from '../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { AssetRepository } from '../../database/repositories/asset-repository';
import { OperationRepository } from '../../database/repositories/operation-repository';
import { LegacyPortfolioAcl } from '../../infrastructure/persistence/legacy/legacy-portfolio-acl';
import { RecalculateAssetPositionUseCase } from '../../application/use-cases/recalculate-asset-position-use-case';
import { ImportBrokerageNoteUseCase } from '../../application/use-cases/import-brokerage-note-use-case';
import { ImportOperationsUseCase } from '../../application/use-cases/import-operations-use-case';
import { SetInitialBalanceUseCase } from '../../application/use-cases/set-initial-balance-use-case';
import { ListPositionsUseCase } from '../../application/use-cases/list-positions-use-case';
import { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position-use-case';
import { MigrateYearUseCase } from '../../application/use-cases/migrate-year-use-case';
import { KnexPositionRepository } from '../../infrastructure/persistence/knex-position.repository';
import { KnexTransactionRepository } from '../../infrastructure/persistence/knex-transaction.repository';
import { KnexBrokerRepository } from '../../infrastructure/persistence/knex-broker.repository';
import { KnexTickerDataRepository } from '../../infrastructure/persistence/knex-ticker-data.repository';
import { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-assets-report-use-case';
import { ReportGenerator } from '../../domain/tax-reporting/report-generator.service';
import { BrokerageNoteParserStrategy } from '../../infrastructure/parsers/brokerage-note-parser.strategy';
import { CsvXlsxBrokerageNoteParser } from '../../infrastructure/parsers/csv-xlsx-brokerage-note.parser';
import {
  registerMainHandlers,
  type MainHandlersDependencies,
} from './register-main-handlers';
import { ManageBrokersUseCase } from '../../application/use-cases/manage-brokers-use-case';
import { CreateBrokerUseCase } from '@main/application/use-cases/create-broker/create-broker.use-case';

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

  it('runs preview, confirm, manual base, list and report channels end-to-end', async () => {
    const assetRepository = new AssetRepository(database);
    const operationRepository = new OperationRepository(database);
    const acl = new LegacyPortfolioAcl(assetRepository, operationRepository);
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
      knexTransactionRepository,
      brokerRepository,
    );
    const recalculatePositionUseCase = new RecalculatePositionUseCase(
      knexPositionRepository,
      knexTransactionRepository,
    );
    const migrateYearUseCase = new MigrateYearUseCase(
      knexPositionRepository,
      knexTransactionRepository,
      (input) => recalculatePositionUseCase.execute(input),
    );
    const reportGenerator = new ReportGenerator();
    const tickerDataRepository = new KnexTickerDataRepository(database);
    const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(
      knexTransactionRepository,
      knexPositionRepository,
      brokerRepository,
      tickerDataRepository,
      reportGenerator,
    );
    const parserStrategy = new BrokerageNoteParserStrategy([new CsvXlsxBrokerageNoteParser()]);

    const csvPath = path.join(temporaryDirectory, 'movements.csv');
    await fs.writeFile(
      csvPath,
      [
        'Data;Tipo;Ticker;Quantidade;Preco Unitario;Taxas Totais;Corretora;Tipo Ativo;IRRF',
        '2025-03-10;Compra;PETR4;10;20;1;XP;stock;0',
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
      previewImportFromFile: async (input) => ({
        commands: await parserStrategy.parse({
          broker: input.broker,
          fileType: 'csv',
          filePath: input.filePath,
        }),
      }),
      importOperations: (input) => importOperationsUseCase.execute(input),
      previewImportTransactions: () =>
        Promise.resolve({ batches: [], transactionsPreview: [] }),
      confirmImportOperations: async (input) => {
        let createdOperationsCount = 0;
        let recalculatedPositionsCount = 0;
        for (const command of input.commands) {
          const result = await importOperationsUseCase.execute(command);
          createdOperationsCount += result.createdOperationsCount;
          recalculatedPositionsCount += result.recalculatedPositionsCount;
        }
        return {
          createdOperationsCount,
          recalculatedPositionsCount,
        };
      },
      confirmImportTransactions: () =>
        Promise.resolve({ importedCount: 0, recalculatedTickers: [] }),
      setInitialBalance: (input) => setInitialBalanceUseCase.execute(input),
      listPositions: (input) => listPositionsUseCase.execute(input),
      recalculatePosition: (input) => recalculatePositionUseCase.execute(input),
      migrateYear: (input) => migrateYearUseCase.execute(input),
      generateAssetsReport: (input) => generateAssetsReportUseCase.execute(input),
      listBrokers: (_input?: { activeOnly?: boolean }) => Promise.resolve({ items: [] }),
      createBroker: () =>
        Promise.resolve({
          success: true,
          broker: { id: 'broker-1', name: 'Test', cnpj: '00.000.000/0001-00', code: 'TEST', active: true } as BrokerListItem,
        }),
      updateBroker: () =>
        Promise.resolve({
          success: true,
          broker: { id: 'broker-1', name: 'Updated', cnpj: '00.000.000/0001-00', code: 'TEST', active: true } as BrokerListItem,
        }),
      toggleBrokerActive: () =>
        Promise.resolve({
          success: true,
          broker: { id: 'broker-1', name: 'Test', cnpj: '00.000.000/0001-00', code: 'TEST', active: false } as BrokerListItem,
        }),
      previewConsolidatedPosition: () => Promise.resolve({ rows: [] }),
      importConsolidatedPosition: () =>
        Promise.resolve({ importedCount: 0, recalculatedTickers: [] }),
      deletePosition: () => Promise.resolve({ deleted: false }),
    };

    registerMainHandlers(ipcMain, dependencies);

    const healthHandler = handlers.get('app:health-check');
    const previewHandler = handlers.get('import:preview-file');
    const confirmHandler = handlers.get('import:confirm-operations');
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
      broker: 'XP',
      filePath: csvPath,
    })) as { commands: Array<{ sourceType: SourceType }> };
    expect(previewResult.commands).toHaveLength(1);
    expect(previewResult.commands[0]?.sourceType).toBe(SourceType.Csv);

    const importResult = (await confirmHandler({}, {
      commands: previewResult.commands,
    })) as { createdOperationsCount: number; recalculatedPositionsCount: number };
    expect(importResult).toEqual({
      createdOperationsCount: 1,
      recalculatedPositionsCount: 1,
    });

    await setInitialBalanceHandler({}, {
      ticker: 'IVVB11',
      brokerId: 'broker-xp',
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
    const manageBrokersUseCase = new ManageBrokersUseCase(brokerRepository);
    const createBrokerUseCase = new CreateBrokerUseCase(brokerRepository);

    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: (channel: string, listener: IpcHandler) => {
        handlers.set(channel, listener);
      },
    };

    const dependencies: MainHandlersDependencies = {
      checkHealth: () => ({ status: 'ok' }),
      importSelectFile: () => Promise.resolve({ filePath: null }),
      previewImportFromFile: () => Promise.resolve({ commands: [] }),
      previewImportTransactions: () =>
        Promise.resolve({ batches: [], transactionsPreview: [] }),
      importOperations: () =>
        Promise.resolve({ createdOperationsCount: 0, recalculatedPositionsCount: 0 }),
      confirmImportOperations: () =>
        Promise.resolve({ createdOperationsCount: 0, recalculatedPositionsCount: 0 }),
      confirmImportTransactions: () =>
        Promise.resolve({ importedCount: 0, recalculatedTickers: [] }),
      setInitialBalance: () => Promise.resolve({ ticker: 'IVVB11', brokerId: 'broker-xp', assetType: AssetType.Etf, quantity: 2, averagePrice: 300, year: 2025 }),
      listPositions: () => Promise.resolve({ items: [] }),
      recalculatePosition: () => Promise.resolve(undefined),
      migrateYear: () =>
        Promise.resolve({ migratedPositionsCount: 0, createdTransactionsCount: 0 }),
      generateAssetsReport: () =>
        Promise.resolve({ referenceDate: '2025-12-31', items: [] }),
      listBrokers: (input) => manageBrokersUseCase.list(input),
      createBroker: (input) => createBrokerUseCase.execute(input),
      updateBroker: (input) => manageBrokersUseCase.update(input),
      toggleBrokerActive: (input) => manageBrokersUseCase.toggleActive(input),
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
