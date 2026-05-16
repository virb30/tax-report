import type { PortfolioModuleExports } from '../portfolio/portfolio.module';
import { TransactionFeeAllocator } from '../portfolio/domain/services/transaction-fee-allocator.service';
import type { SharedInfrastructure } from '../shared/application/shared-infrastructure';
import type { Http } from '../shared/infra/http/http.interface';
import type { DailyBrokerTaxRepository } from './application/repositories/daily-broker-tax.repository';
import { ReallocateTransactionFeesService } from './application/services/reallocate-transaction-fees.service';
import { DeleteDailyBrokerTaxUseCase } from './application/use-cases/delete-daily-broker-tax.use-case';
import { ImportConsolidatedPositionUseCase } from './application/use-cases/import-consolidated-position.use-case';
import { ImportDailyBrokerTaxesUseCase } from './application/use-cases/import-daily-broker-taxes.use-case';
import { ImportTransactionsUseCase } from './application/use-cases/import-transactions.use-case';
import { ListDailyBrokerTaxesUseCase } from './application/use-cases/list-daily-broker-taxes.use-case';
import { PreviewImportUseCase } from './application/use-cases/preview-import.use-case';
import { SaveDailyBrokerTaxUseCase } from './application/use-cases/save-daily-broker-tax.use-case';
import { SheetjsSpreadsheetFileReader } from './infra/file-readers/sheetjs.spreadsheet.file-reader';
import { CsvXlsxConsolidatedPositionParser } from './infra/parsers/csv-xlsx-consolidated-position.parser';
import { CsvXlsxDailyBrokerTaxParser } from './infra/parsers/csv-xlsx-daily-broker-tax.parser';
import { CsvXlsxTransactionParser } from './infra/parsers/csv-xlsx-transaction.parser';
import { KnexDailyBrokerTaxRepository } from './infra/repositories/knex-daily-broker-tax.repository';
import { ConsolidatedPositionImportController } from './transport/http/controllers/consolidated-position-import.controller';
import { DailyBrokerTaxController } from './transport/http/controllers/daily-broker-tax.controller';
import { TransactionsController } from './transport/http/controllers/transactions.controller';

interface IngestionModuleUseCases {
  importTransactionsUseCase: ImportTransactionsUseCase;
  previewImportUseCase: PreviewImportUseCase;
  listDailyBrokerTaxesUseCase: ListDailyBrokerTaxesUseCase;
  saveDailyBrokerTaxUseCase: SaveDailyBrokerTaxUseCase;
  importDailyBrokerTaxesUseCase: ImportDailyBrokerTaxesUseCase;
  deleteDailyBrokerTaxUseCase: DeleteDailyBrokerTaxUseCase;
  importConsolidatedPositionUseCase: ImportConsolidatedPositionUseCase;
}

export type IngestionPortfolioDependencies = Pick<
  PortfolioModuleExports,
  'brokerRepository' | 'assetRepository' | 'transactionRepository' | 'transactionFeeRepository'
>;

export interface IngestionModuleExports {
  dailyBrokerTaxRepository: DailyBrokerTaxRepository;
}

export interface IngestionModuleOverrides {
  exports?: Partial<IngestionModuleExports>;
  useCases?: Partial<IngestionModuleUseCases>;
}

export interface IngestionModuleInput {
  shared: SharedInfrastructure;
  portfolio: IngestionPortfolioDependencies;
  http?: Http;
  overrides?: IngestionModuleOverrides;
}

export class IngestionModule {
  readonly exports: IngestionModuleExports;
  private readonly useCases: IngestionModuleUseCases;

  constructor(input: IngestionModuleInput) {
    const dailyBrokerTaxRepository =
      input.overrides?.exports?.dailyBrokerTaxRepository ??
      new KnexDailyBrokerTaxRepository(input.shared.database);
    const transactionFeeAllocator = new TransactionFeeAllocator();
    const spreadsheetFileReader = new SheetjsSpreadsheetFileReader();
    const transactionParser = new CsvXlsxTransactionParser(
      spreadsheetFileReader,
      input.portfolio.brokerRepository,
    );
    const dailyBrokerTaxesParser = new CsvXlsxDailyBrokerTaxParser(
      spreadsheetFileReader,
      input.portfolio.brokerRepository,
    );
    const consolidatedPositionParser = new CsvXlsxConsolidatedPositionParser();
    const reallocateTransactionFeesService = new ReallocateTransactionFeesService(
      dailyBrokerTaxRepository,
      input.portfolio.transactionRepository,
      input.portfolio.transactionFeeRepository,
      transactionFeeAllocator,
    );

    this.exports = {
      dailyBrokerTaxRepository,
    };
    this.useCases = {
      importTransactionsUseCase:
        input.overrides?.useCases?.importTransactionsUseCase ??
        new ImportTransactionsUseCase(
          transactionParser,
          input.portfolio.assetRepository,
          input.portfolio.transactionRepository,
          reallocateTransactionFeesService,
          input.shared.queue,
        ),
      previewImportUseCase:
        input.overrides?.useCases?.previewImportUseCase ??
        new PreviewImportUseCase(
          transactionParser,
          transactionFeeAllocator,
          dailyBrokerTaxRepository,
          input.portfolio.assetRepository,
        ),
      listDailyBrokerTaxesUseCase:
        input.overrides?.useCases?.listDailyBrokerTaxesUseCase ??
        new ListDailyBrokerTaxesUseCase(dailyBrokerTaxRepository, input.portfolio.brokerRepository),
      saveDailyBrokerTaxUseCase:
        input.overrides?.useCases?.saveDailyBrokerTaxUseCase ??
        new SaveDailyBrokerTaxUseCase(
          dailyBrokerTaxRepository,
          input.portfolio.brokerRepository,
          reallocateTransactionFeesService,
          input.shared.queue,
        ),
      importDailyBrokerTaxesUseCase:
        input.overrides?.useCases?.importDailyBrokerTaxesUseCase ??
        new ImportDailyBrokerTaxesUseCase(
          dailyBrokerTaxesParser,
          dailyBrokerTaxRepository,
          reallocateTransactionFeesService,
          input.shared.queue,
        ),
      deleteDailyBrokerTaxUseCase:
        input.overrides?.useCases?.deleteDailyBrokerTaxUseCase ??
        new DeleteDailyBrokerTaxUseCase(
          dailyBrokerTaxRepository,
          reallocateTransactionFeesService,
          input.shared.queue,
        ),
      importConsolidatedPositionUseCase:
        input.overrides?.useCases?.importConsolidatedPositionUseCase ??
        new ImportConsolidatedPositionUseCase(
          consolidatedPositionParser,
          input.portfolio.assetRepository,
          input.portfolio.brokerRepository,
          input.portfolio.transactionRepository,
          input.shared.queue,
        ),
    };

    if (input.http) {
      void new TransactionsController(input.http, {
        previewImportUseCase: this.useCases.previewImportUseCase,
        importTransactionsUseCase: this.useCases.importTransactionsUseCase,
      });
      void new DailyBrokerTaxController(input.http, {
        listDailyBrokerTaxesUseCase: this.useCases.listDailyBrokerTaxesUseCase,
        saveDailyBrokerTaxUseCase: this.useCases.saveDailyBrokerTaxUseCase,
        importDailyBrokerTaxesUseCase: this.useCases.importDailyBrokerTaxesUseCase,
        deleteDailyBrokerTaxUseCase: this.useCases.deleteDailyBrokerTaxUseCase,
      });
      void new ConsolidatedPositionImportController(input.http, {
        importConsolidatedPositionUseCase: this.useCases.importConsolidatedPositionUseCase,
      });
    }
  }
}
