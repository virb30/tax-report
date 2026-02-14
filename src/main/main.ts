import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { CsvXlsxBrokerageNoteParser } from './infrastructure/parsers/csv-xlsx-brokerage-note.parser';
import { BrokerageNoteParserStrategy } from './infrastructure/parsers/brokerage-note-parser.strategy';
import { createMainLifecycle } from './infrastructure/composition/create-main-lifecycle';
import { createAndInitializeDatabase } from './database/database';
import { AssetRepository } from './database/repositories/asset-repository';
import { OperationRepository } from './database/repositories/operation-repository';
import { KnexBrokerRepository } from './infrastructure/persistence/knex-broker.repository';
import { ManageBrokersUseCase } from './application/use-cases/manage-brokers-use-case';
import { LegacyPortfolioAcl } from './infrastructure/persistence/legacy/legacy-portfolio-acl';
import { RecalculateAssetPositionUseCase } from './application/use-cases/recalculate-asset-position-use-case';
import { RecalculatePositionUseCase } from './application/use-cases/recalculate-position-use-case';
import { MigrateYearUseCase } from './application/use-cases/migrate-year-use-case';
import { ImportBrokerageNoteUseCase } from './application/use-cases/import-brokerage-note-use-case';
import { ImportOperationsUseCase } from './application/use-cases/import-operations-use-case';
import { ImportTransactionsUseCase } from './application/use-cases/import-transactions-use-case';
import { PreviewImportUseCase } from './application/use-cases/preview-import-use-case';
import { TaxApportioner } from './domain/ingestion/tax-apportioner.service';
import { CsvXlsxTransactionParser } from './infrastructure/parsers/csv-xlsx-transaction.parser';
import { SetInitialBalanceUseCase } from './application/use-cases/set-initial-balance-use-case';
import { ListPositionsUseCase } from './application/use-cases/list-positions-use-case';
import { KnexPositionRepository } from './infrastructure/persistence/knex-position.repository';
import { KnexTransactionRepository } from './infrastructure/persistence/knex-transaction.repository';
import { GenerateAssetsReportUseCase } from './application/use-cases/generate-assets-report-use-case';
import type { OperationsFileParserPort } from './application/ports/operations-file-parser.port';
import { WindowManager } from './window-manager';

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
    previewImportFromFile: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      const commands = await dependencies.operationsFileParser.parse({
        broker: input.broker,
        fileType: resolveFileTypeFromPath(input.filePath),
        filePath: input.filePath,
      });
      return { commands };
    },
    previewImportTransactions: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.previewImportUseCase.execute(input);
    },
    importOperations: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.importOperationsUseCase.execute(input);
    },
    confirmImportOperations: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      let createdOperationsCount = 0;
      let recalculatedPositionsCount = 0;
      for (const command of input.commands) {
        const result = await dependencies.importOperationsUseCase.execute(command);
        createdOperationsCount += result.createdOperationsCount;
        recalculatedPositionsCount += result.recalculatedPositionsCount;
      }
      return {
        createdOperationsCount,
        recalculatedPositionsCount,
      };
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
    listBrokers: async () => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.manageBrokersUseCase.list();
    },
    createBroker: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.manageBrokersUseCase.create(input);
    },
    recalculatePosition: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.recalculatePositionUseCase.execute(input);
    },
    migrateYear: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.migrateYearUseCase.execute(input);
    },
  },
  platform: process.platform,
  createMainWindow: () => {
    windowManager.createMainWindow();
  },
});

lifecycle.register();

type MainHandlersRuntimeDependencies = {
  operationsFileParser: OperationsFileParserPort;
  importOperationsUseCase: ImportOperationsUseCase;
  importTransactionsUseCase: ImportTransactionsUseCase;
  previewImportUseCase: PreviewImportUseCase;
  setInitialBalanceUseCase: SetInitialBalanceUseCase;
  listPositionsUseCase: ListPositionsUseCase;
  generateAssetsReportUseCase: GenerateAssetsReportUseCase;
  manageBrokersUseCase: ManageBrokersUseCase;
  recalculatePositionUseCase: RecalculatePositionUseCase;
  migrateYearUseCase: MigrateYearUseCase;
};

async function createMainHandlersDependencies(): Promise<MainHandlersRuntimeDependencies> {
  await app.whenReady();
  const userDataPath = app.getPath('userData');
  const { database } = await createAndInitializeDatabase(userDataPath);
  const assetRepository = new AssetRepository(database);
  const operationRepository = new OperationRepository(database);
  const legacyPortfolioAcl = new LegacyPortfolioAcl(assetRepository, operationRepository);
  const recalculateAssetPositionUseCase = new RecalculateAssetPositionUseCase(
    legacyPortfolioAcl,
    legacyPortfolioAcl,
  );
  const importBrokerageNoteUseCase = new ImportBrokerageNoteUseCase(
    operationRepository,
    recalculateAssetPositionUseCase,
  );
  const importOperationsUseCase = new ImportOperationsUseCase(importBrokerageNoteUseCase);
  const parserStrategy = new BrokerageNoteParserStrategy([new CsvXlsxBrokerageNoteParser()]);
  const brokerRepository = new KnexBrokerRepository(database);
  const manageBrokersUseCase = new ManageBrokersUseCase(brokerRepository);
  const knexPositionRepository = new KnexPositionRepository(database);
  const knexTransactionRepository = new KnexTransactionRepository(database);
  const recalculatePositionUseCase = new RecalculatePositionUseCase(
    knexPositionRepository,
    knexTransactionRepository,
  );
  const taxApportioner = new TaxApportioner();
  const csvXlsxTransactionParser = new CsvXlsxTransactionParser(
    new CsvXlsxBrokerageNoteParser(),
    brokerRepository,
  );
  const importTransactionsUseCase = new ImportTransactionsUseCase(
    csvXlsxTransactionParser,
    taxApportioner,
    knexTransactionRepository,
    recalculatePositionUseCase,
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
    knexTransactionRepository,
    brokerRepository,
  );

  const migrateYearUseCase = new MigrateYearUseCase(
    knexPositionRepository,
    knexTransactionRepository,
    (input) => recalculatePositionUseCase.execute(input),
  );
  const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(
    legacyPortfolioAcl,
    operationRepository,
  );

  return {
    operationsFileParser: parserStrategy,
    importOperationsUseCase,
    importTransactionsUseCase,
    previewImportUseCase,
    setInitialBalanceUseCase,
    listPositionsUseCase,
    generateAssetsReportUseCase,
    manageBrokersUseCase,
    recalculatePositionUseCase,
    migrateYearUseCase,
  };
}

function resolveFileTypeFromPath(filePath: string): 'csv' | 'xlsx' | 'pdf' {
  const normalizedFilePath = filePath.toLowerCase();
  if (normalizedFilePath.endsWith('.csv')) {
    return 'csv';
  }
  if (normalizedFilePath.endsWith('.xlsx')) {
    return 'xlsx';
  }
  if (normalizedFilePath.endsWith('.pdf')) {
    return 'pdf';
  }
  throw new Error('Unsupported file extension.');
}
