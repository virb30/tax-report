import { app, BrowserWindow, ipcMain } from 'electron';
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
import { ImportBrokerageNoteUseCase } from './application/use-cases/import-brokerage-note-use-case';
import { ImportOperationsUseCase } from './application/use-cases/import-operations-use-case';
import { SetManualBaseUseCase } from './application/use-cases/set-manual-base-use-case';
import { ListPositionsUseCase } from './application/use-cases/list-positions-use-case';
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
    previewImportFromFile: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      const commands = await dependencies.operationsFileParser.parse({
        broker: input.broker,
        fileType: resolveFileTypeFromPath(input.filePath),
        filePath: input.filePath,
      });
      return { commands };
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
    setManualBase: async (input) => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.setManualBaseUseCase.execute(input);
    },
    listPositions: async () => {
      const dependencies = await handlersDependenciesPromise;
      return dependencies.listPositionsUseCase.execute();
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
  setManualBaseUseCase: SetManualBaseUseCase;
  listPositionsUseCase: ListPositionsUseCase;
  generateAssetsReportUseCase: GenerateAssetsReportUseCase;
  manageBrokersUseCase: ManageBrokersUseCase;
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
  const setManualBaseUseCase = new SetManualBaseUseCase(legacyPortfolioAcl);
  const listPositionsUseCase = new ListPositionsUseCase(legacyPortfolioAcl);
  const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(
    legacyPortfolioAcl,
    operationRepository,
  );
  const parserStrategy = new BrokerageNoteParserStrategy([new CsvXlsxBrokerageNoteParser()]);
  const brokerRepository = new KnexBrokerRepository(database);
  const manageBrokersUseCase = new ManageBrokersUseCase(brokerRepository);

  return {
    operationsFileParser: parserStrategy,
    importOperationsUseCase,
    setManualBaseUseCase,
    listPositionsUseCase,
    generateAssetsReportUseCase,
    manageBrokersUseCase,
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
