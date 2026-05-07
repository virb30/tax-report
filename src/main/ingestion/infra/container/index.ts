import { ReallocateTransactionFeesService } from '../../application/services/reallocate-transaction-fees.service';
import { DeleteDailyBrokerTaxUseCase } from '../../application/use-cases/delete-daily-broker-tax.use-case';
import { ImportConsolidatedPositionUseCase } from '../../application/use-cases/import-consolidated-position.use-case';
import { ImportDailyBrokerTaxesUseCase } from '../../application/use-cases/import-daily-broker-taxes.use-case';
import { ImportTransactionsUseCase } from '../../application/use-cases/import-transactions.use-case';
import { ListDailyBrokerTaxesUseCase } from '../../application/use-cases/list-daily-broker-taxes.use-case';
import { PreviewImportUseCase } from '../../application/use-cases/preview-import.use-case';
import { SaveDailyBrokerTaxUseCase } from '../../application/use-cases/save-daily-broker-tax.use-case';
import { SheetjsSpreadsheetFileReader } from '../file-readers/sheetjs.spreadsheet.file-reader';
import { CsvXlsxConsolidatedPositionParser } from '../parsers/csv-xlsx-consolidated-position.parser';
import { CsvXlsxDailyBrokerTaxParser } from '../parsers/csv-xlsx-daily-broker-tax.parser';
import { CsvXlsxTransactionParser } from '../parsers/csv-xlsx-transaction.parser';
import { KnexDailyBrokerTaxRepository } from '../repositories/knex-daily-broker-tax.repository';
import { dialog } from 'electron';
import { bindIpcContract } from '../../../../ipc/main/binding/bind-ipc-contract';
import {
  confirmImportTransactionsContract,
  deleteDailyBrokerTaxContract,
  importDailyBrokerTaxesContract,
  importSelectFileContract,
  listDailyBrokerTaxesContract,
  previewImportTransactionsContract,
  saveDailyBrokerTaxContract,
} from '../../../../ipc/contracts/ingestion/import';
import type { IpcMainHandleRegistry } from '../../../../ipc/main/binding/ipc-main-handle-registry';
import type {
  IngestionModule,
  IngestionPortfolioDependencies,
  SharedInfrastructure,
} from '../../../app/infra/container';

export type CreateIngestionModuleInput = {
  shared: SharedInfrastructure;
  portfolio: IngestionPortfolioDependencies;
};

export function createIngestionModule(input: CreateIngestionModuleInput): IngestionModule {
  const { shared, portfolio } = input;

  const dailyBrokerTaxRepository = new KnexDailyBrokerTaxRepository(shared.database);
  const spreadsheetFileReader = new SheetjsSpreadsheetFileReader();
  const transactionParser = new CsvXlsxTransactionParser(
    spreadsheetFileReader,
    portfolio.brokerRepository,
  );
  const dailyBrokerTaxesParser = new CsvXlsxDailyBrokerTaxParser(
    spreadsheetFileReader,
    portfolio.brokerRepository,
  );
  const consolidatedPositionParser = new CsvXlsxConsolidatedPositionParser();
  const reallocateTransactionFeesService = new ReallocateTransactionFeesService(
    dailyBrokerTaxRepository,
    portfolio.transactionRepository,
    portfolio.transactionFeeRepository,
    shared.transactionFeeAllocator,
  );
  const importTransactionsUseCase = new ImportTransactionsUseCase(
    transactionParser,
    portfolio.assetRepository,
    portfolio.transactionRepository,
    reallocateTransactionFeesService,
    shared.queue,
  );
  const previewImportUseCase = new PreviewImportUseCase(
    transactionParser,
    shared.transactionFeeAllocator,
    dailyBrokerTaxRepository,
    portfolio.assetRepository,
  );
  const listDailyBrokerTaxesUseCase = new ListDailyBrokerTaxesUseCase(
    dailyBrokerTaxRepository,
    portfolio.brokerRepository,
  );
  const saveDailyBrokerTaxUseCase = new SaveDailyBrokerTaxUseCase(
    dailyBrokerTaxRepository,
    portfolio.brokerRepository,
    reallocateTransactionFeesService,
    shared.queue,
  );
  const importDailyBrokerTaxesUseCase = new ImportDailyBrokerTaxesUseCase(
    dailyBrokerTaxesParser,
    dailyBrokerTaxRepository,
    reallocateTransactionFeesService,
    shared.queue,
  );
  const deleteDailyBrokerTaxUseCase = new DeleteDailyBrokerTaxUseCase(
    dailyBrokerTaxRepository,
    reallocateTransactionFeesService,
    shared.queue,
  );
  const importConsolidatedPositionUseCase = new ImportConsolidatedPositionUseCase(
    consolidatedPositionParser,
    portfolio.assetRepository,
    portfolio.brokerRepository,
    portfolio.transactionRepository,
    shared.queue,
  );
  const registerIpc = (ipcMain: IpcMainHandleRegistry): void =>
    registerImportIpc(ipcMain, {
      previewImportUseCase,
      importTransactionsUseCase,
      listDailyBrokerTaxesUseCase,
      saveDailyBrokerTaxUseCase,
      importDailyBrokerTaxesUseCase,
      deleteDailyBrokerTaxUseCase,
    });

  return {
    repositories: {
      dailyBrokerTaxRepository,
    },
    parsers: {
      spreadsheetFileReader,
      transactionParser,
      dailyBrokerTaxesParser,
      consolidatedPositionParser,
    },
    services: {
      reallocateTransactionFeesService,
    },
    useCases: {
      importTransactionsUseCase,
      previewImportUseCase,
      listDailyBrokerTaxesUseCase,
      saveDailyBrokerTaxUseCase,
      importDailyBrokerTaxesUseCase,
      deleteDailyBrokerTaxUseCase,
      importConsolidatedPositionUseCase,
    },
    registerIpc,
  };
}

type ImportIpcDependencies = {
  previewImportUseCase: PreviewImportUseCase;
  importTransactionsUseCase: ImportTransactionsUseCase;
  listDailyBrokerTaxesUseCase: ListDailyBrokerTaxesUseCase;
  saveDailyBrokerTaxUseCase: SaveDailyBrokerTaxUseCase;
  importDailyBrokerTaxesUseCase: ImportDailyBrokerTaxesUseCase;
  deleteDailyBrokerTaxUseCase: DeleteDailyBrokerTaxUseCase;
};

function registerImportIpc(
  ipcMain: IpcMainHandleRegistry,
  dependencies: ImportIpcDependencies,
): void {
  bindIpcContract(ipcMain, importSelectFileContract, async () => {
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
  });
  bindIpcContract(ipcMain, previewImportTransactionsContract, (payload) =>
    dependencies.previewImportUseCase.execute(payload),
  );
  bindIpcContract(ipcMain, confirmImportTransactionsContract, async (payload) => {
    const result = await dependencies.importTransactionsUseCase.execute(payload);

    return {
      importedCount: result.importedCount,
      recalculatedTickers: result.recalculatedTickers,
      skippedUnsupportedRows: result.skippedUnsupportedRows,
    };
  });
  bindIpcContract(ipcMain, listDailyBrokerTaxesContract, () =>
    dependencies.listDailyBrokerTaxesUseCase.execute(),
  );
  bindIpcContract(ipcMain, saveDailyBrokerTaxContract, (payload) =>
    dependencies.saveDailyBrokerTaxUseCase.execute(payload),
  );
  bindIpcContract(ipcMain, importDailyBrokerTaxesContract, (payload) =>
    dependencies.importDailyBrokerTaxesUseCase.execute(payload),
  );
  bindIpcContract(ipcMain, deleteDailyBrokerTaxContract, (payload) =>
    dependencies.deleteDailyBrokerTaxUseCase.execute(payload),
  );
}
