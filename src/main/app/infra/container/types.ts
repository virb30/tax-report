import type { Knex } from 'knex';
import type { IpcMainHandleRegistry } from '../../../../ipc/main/binding/ipc-main-handle-registry';
import type { ConsolidatedPositionParserPort } from '../../../ingestion/application/interfaces/consolidated-position-parser.port';
import type { DailyBrokerTaxesParser } from '../../../ingestion/application/interfaces/daily-broker-taxes.parser.interface';
import type { SpreadsheetFileReader } from '../../../ingestion/application/interfaces/spreadsheet.file-reader';
import type { ImportTransactionsParser } from '../../../ingestion/application/interfaces/transactions.parser.interface';
import type { DailyBrokerTaxRepository as IngestionDailyBrokerTaxRepository } from '../../../ingestion/application/repositories/daily-broker-tax.repository';
import type { ReallocateTransactionFeesService } from '../../../ingestion/application/services/reallocate-transaction-fees.service';
import type { DeleteDailyBrokerTaxUseCase } from '../../../ingestion/application/use-cases/delete-daily-broker-tax.use-case';
import type { ImportConsolidatedPositionUseCase } from '../../../ingestion/application/use-cases/import-consolidated-position.use-case';
import type { ImportDailyBrokerTaxesUseCase } from '../../../ingestion/application/use-cases/import-daily-broker-taxes.use-case';
import type { ImportTransactionsUseCase } from '../../../ingestion/application/use-cases/import-transactions.use-case';
import type { ListDailyBrokerTaxesUseCase } from '../../../ingestion/application/use-cases/list-daily-broker-taxes.use-case';
import type { PreviewImportUseCase } from '../../../ingestion/application/use-cases/preview-import.use-case';
import type { SaveDailyBrokerTaxUseCase } from '../../../ingestion/application/use-cases/save-daily-broker-tax.use-case';
import type { Queue } from '../../../shared/application/events/queue.interface';
import type { GenerateAssetsReportUseCase } from '../../../tax-reporting/application/use-cases/generate-assets-report.use-case';
import type { MonthlyTaxCloseRepository } from '../../../tax-reporting/application/repositories/monthly-tax-close.repository';
import type { AssetPositionRepository } from '../../../portfolio/application/repositories/asset-position.repository';
import type { AssetRepository } from '../../../portfolio/application/repositories/asset.repository';
import type { BrokerRepository } from '../../../portfolio/application/repositories/broker.repository';
import type { TransactionFeeRepository } from '../../../portfolio/application/repositories/transaction-fee.repository';
import type { TransactionRepository } from '../../../portfolio/application/repositories/transaction.repository';
import type { TransactionFeeAllocator } from '../../../portfolio/domain/services/transaction-fee-allocator.service';

export interface SharedInfrastructure {
  database: Knex;
  queue: Queue;
  transactionFeeAllocator: TransactionFeeAllocator;
}

export interface PortfolioModuleExports {
  brokerRepository: BrokerRepository;
  positionRepository: AssetPositionRepository;
  transactionRepository: TransactionRepository;
  transactionFeeRepository: TransactionFeeRepository;
  assetRepository: AssetRepository;
}

export interface MainProcessModule {
  registerIpc(ipcMain: IpcMainHandleRegistry): void;
  startup?: {
    initialize(): void;
  };
}

export type AppModule = MainProcessModule;

export interface PortfolioModule extends MainProcessModule {
  exports: PortfolioModuleExports;
}

export type IngestionPortfolioDependencies = Pick<
  PortfolioModuleExports,
  'brokerRepository' | 'assetRepository' | 'transactionRepository' | 'transactionFeeRepository'
>;

export interface IngestionModuleRepositories {
  dailyBrokerTaxRepository: IngestionDailyBrokerTaxRepository;
}

export interface IngestionModuleParsers {
  spreadsheetFileReader: SpreadsheetFileReader;
  transactionParser: ImportTransactionsParser;
  dailyBrokerTaxesParser: DailyBrokerTaxesParser;
  consolidatedPositionParser: ConsolidatedPositionParserPort;
}

export interface IngestionModuleServices {
  reallocateTransactionFeesService: ReallocateTransactionFeesService;
}

export interface IngestionModuleUseCases {
  importTransactionsUseCase: ImportTransactionsUseCase;
  previewImportUseCase: PreviewImportUseCase;
  listDailyBrokerTaxesUseCase: ListDailyBrokerTaxesUseCase;
  saveDailyBrokerTaxUseCase: SaveDailyBrokerTaxUseCase;
  importDailyBrokerTaxesUseCase: ImportDailyBrokerTaxesUseCase;
  deleteDailyBrokerTaxUseCase: DeleteDailyBrokerTaxUseCase;
  importConsolidatedPositionUseCase: ImportConsolidatedPositionUseCase;
}

export interface IngestionModule extends MainProcessModule {
  repositories: IngestionModuleRepositories;
  parsers: IngestionModuleParsers;
  services: IngestionModuleServices;
  useCases: IngestionModuleUseCases;
}

export type TaxReportingPortfolioDependencies = Pick<
  PortfolioModuleExports,
  'positionRepository' | 'brokerRepository' | 'assetRepository' | 'transactionRepository'
>;

export type TaxReportingIngestionDependencies = Pick<
  IngestionModuleRepositories,
  'dailyBrokerTaxRepository'
>;

export interface TaxReportingModuleUseCases {
  generateAssetsReportUseCase: GenerateAssetsReportUseCase;
}

export interface TaxReportingModuleRepositories {
  monthlyTaxCloseRepository: MonthlyTaxCloseRepository;
  dailyBrokerTaxRepository: IngestionDailyBrokerTaxRepository;
}

export interface TaxReportingModule extends MainProcessModule {
  repositories: TaxReportingModuleRepositories;
  useCases: TaxReportingModuleUseCases;
}
