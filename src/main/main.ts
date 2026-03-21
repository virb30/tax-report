import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { createMainLifecycle } from './infrastructure/composition/create-main-lifecycle';
import { createAndInitializeDatabase } from './database/database';
import { KnexBrokerRepository } from './infrastructure/repositories/knex-broker.repository';
import { RecalculatePositionUseCase } from './application/use-cases/recalculate-position/recalculate-position.use-case';
import { MigrateYearUseCase } from './application/use-cases/migrate-year/migrate-year.use-case';
import { ImportTransactionsUseCase } from './application/use-cases/import-transactions/import-transactions-use-case';
import { PreviewImportUseCase } from './application/use-cases/preview-import/preview-import-use-case';
import { TaxApportioner } from './domain/ingestion/tax-apportioner.service';
import { CsvXlsxTransactionParser } from './infrastructure/parsers/csv-xlsx-transaction.parser';
import { SheetjsSpreadsheetFileReader } from './infrastructure/adapters/file-readers/sheetjs.spreadsheet.file-reader';
import { CsvXlsxConsolidatedPositionParser } from './infrastructure/parsers/csv-xlsx-consolidated-position.parser';
import { ImportConsolidatedPositionUseCase } from './application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import { DeletePositionUseCase } from './application/use-cases/delete-position/delete-position.use-case';
import { SetInitialBalanceUseCase } from './application/use-cases/set-initial-balance/set-initial-balance.use-case';
import { ListPositionsUseCase } from './application/use-cases/list-positions/list-positions-use-case';
import { KnexPositionRepository } from './infrastructure/repositories/knex-position.repository';
import { KnexTransactionRepository } from './infrastructure/repositories/knex-transaction.repository';
import { KnexAssetRepository } from './infrastructure/repositories/knex-asset.repository';
import { GenerateAssetsReportUseCase } from './application/use-cases/generate-asset-report/generate-assets-report.use-case';
import { ReportGenerator } from './domain/tax-reporting/report-generator.service';
import { WindowManager } from './window-manager';
import { CreateBrokerUseCase } from './application/use-cases/create-broker/create-broker.use-case';
import { ListBrokersUseCase } from './application/use-cases/list-brokers/list-brokers.use-case';
import { UpdateBrokerUseCase } from './application/use-cases/update-broker/update-broker.use-case';
import { ToggleActiveBrokerUseCase } from './application/use-cases/toggle-active-broker/toggle-active-broker.use-case';
import { MemoryQueueAdapter } from './infrastructure/events/memory-queue.adapter';
import { RecalculatePositionHandler } from './infrastructure/handlers/recalculate-position.handler';

const handlersDependenciesPromise = createMainHandlersDependencies();
const windowManager = new WindowManager();

const lifecycle = createMainLifecycle({
  app,
  browserWindow: BrowserWindow,
  ipcMain,
  mainHandlersDependencies: {
    checkHealth: () => ({ status: 'ok' }),
    importSelectFile: async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Planilhas', extensions: ['csv', 'xlsx'] },
          { name: 'Todos os arquivos', extensions: ['*'] },
        ],
      });
      if (result.canceled) {
        return { filePath: null };
      }
      return { filePath: result.filePaths[0] ?? null };
    },
    previewImportTransactions: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.previewImportUseCase.execute(input);
    },
    confirmImportTransactions: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      const result = await dependencies.importTransactionsUseCase.execute(input);
      return {
        importedCount: result.importedCount,
        recalculatedTickers: result.recalculatedTickers,
      };
    },
    setInitialBalance: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.setInitialBalanceUseCase.execute(input);
    },
    listPositions: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.listPositionsUseCase.execute(input);
    },
    generateAssetsReport: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.generateAssetsReportUseCase.execute(input);
    },
    listBrokers: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.listBrokersUseCase.execute(input);
    },
    createBroker: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.createBrokerUseCase.execute(input);
    },
    updateBroker: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.updateBrokerUseCase.execute(input);
    },
    toggleBrokerActive: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.toggleActiveBrokerUseCase.execute(input);
    },
    recalculatePosition: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.recalculatePositionUseCase.execute(input);
    },
    migrateYear: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.migrateYearUseCase.execute(input);
    },
    previewConsolidatedPosition: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.importConsolidatedPositionUseCase.preview(input);
    },
    importConsolidatedPosition: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.importConsolidatedPositionUseCase.execute(input);
    },
    deletePosition: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.deletePositionUseCase.execute(input);
    },
  },
  platform: process.platform,
  createMainWindow: () => {
    windowManager.createMainWindow();
  },
});

lifecycle.register();

type MainHandlersRuntimeDependencies = {
  importTransactionsUseCase: ImportTransactionsUseCase;
  previewImportUseCase: PreviewImportUseCase;
  setInitialBalanceUseCase: SetInitialBalanceUseCase;
  listPositionsUseCase: ListPositionsUseCase;
  generateAssetsReportUseCase: GenerateAssetsReportUseCase;
  toggleActiveBrokerUseCase: ToggleActiveBrokerUseCase;
  createBrokerUseCase: CreateBrokerUseCase;
  updateBrokerUseCase: UpdateBrokerUseCase;
  listBrokersUseCase: ListBrokersUseCase;
  recalculatePositionUseCase: RecalculatePositionUseCase;
  migrateYearUseCase: MigrateYearUseCase;
  importConsolidatedPositionUseCase: ImportConsolidatedPositionUseCase;
  deletePositionUseCase: DeletePositionUseCase;
};

async function createMainHandlersDependencies(): Promise<MainHandlersRuntimeDependencies> {
  await app.whenReady();
  const userDataPath = app.getPath('userData');
  const { database } = await createAndInitializeDatabase(userDataPath);
  const brokerRepository = new KnexBrokerRepository(database);
  const createBrokerUseCase = new CreateBrokerUseCase(brokerRepository);
  const updateBrokerUseCase = new UpdateBrokerUseCase(brokerRepository);
  const listBrokersUseCase = new ListBrokersUseCase(brokerRepository);
  const toggleActiveBrokerUseCase = new ToggleActiveBrokerUseCase(brokerRepository);
  const knexPositionRepository = new KnexPositionRepository(database);
  const knexTransactionRepository = new KnexTransactionRepository(database);
  const recalculatePositionUseCase = new RecalculatePositionUseCase(
    knexPositionRepository,
    knexTransactionRepository,
  );
  const queue = new MemoryQueueAdapter();
  new RecalculatePositionHandler(
    queue,
    recalculatePositionUseCase,
  );
  const taxApportioner = new TaxApportioner();
  const spreadsheetFileReader = new SheetjsSpreadsheetFileReader();
  const csvXlsxTransactionParser = new CsvXlsxTransactionParser(
    spreadsheetFileReader,
    brokerRepository,
  );
  const importTransactionsUseCase = new ImportTransactionsUseCase(
    csvXlsxTransactionParser,
    taxApportioner,
    knexTransactionRepository,
    queue,
  );
  const previewImportUseCase = new PreviewImportUseCase(
    csvXlsxTransactionParser,
    taxApportioner,
  );

  const setInitialBalanceUseCase = new SetInitialBalanceUseCase(
    knexPositionRepository,
    knexTransactionRepository,
  );
  const listPositionsUseCase = new ListPositionsUseCase(
    knexPositionRepository,
    brokerRepository,
  );

  const migrateYearUseCase = new MigrateYearUseCase(
    knexPositionRepository,
    knexTransactionRepository,
  );

  const consolidatedPositionParser = new CsvXlsxConsolidatedPositionParser();
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

  const tickerDataRepository = new KnexAssetRepository(database);
  const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(
    knexPositionRepository,
    brokerRepository,
    tickerDataRepository,
  );

  return {
    importTransactionsUseCase,
    previewImportUseCase,
    setInitialBalanceUseCase,
    listPositionsUseCase,
    generateAssetsReportUseCase,
    toggleActiveBrokerUseCase,
    createBrokerUseCase,
    updateBrokerUseCase,
    listBrokersUseCase,
    recalculatePositionUseCase,
    migrateYearUseCase,
    importConsolidatedPositionUseCase,
    deletePositionUseCase,
  };
}
