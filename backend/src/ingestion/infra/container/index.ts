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
  };
}
