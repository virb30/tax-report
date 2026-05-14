import type { Knex } from 'knex';
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
import type { GetMonthlyTaxDetailUseCase } from '../../../tax-reporting/application/use-cases/get-monthly-tax-detail.use-case';
import type { GenerateAssetsReportUseCase } from '../../../tax-reporting/application/use-cases/generate-assets-report.use-case';
import type { ListMonthlyTaxHistoryUseCase } from '../../../tax-reporting/application/use-cases/list-monthly-tax-history.use-case';
import type { RecalculateMonthlyTaxHistoryUseCase } from '../../../tax-reporting/application/use-cases/recalculate-monthly-tax-history.use-case';
import type { MonthlyTaxCloseRepository } from '../../../tax-reporting/application/repositories/monthly-tax-close.repository';
import type { AssetPositionRepository } from '../../../portfolio/application/repositories/asset-position.repository';
import type { AssetRepository } from '../../../portfolio/application/repositories/asset.repository';
import type { BrokerRepository } from '../../../portfolio/application/repositories/broker.repository';
import type { TransactionFeeRepository } from '../../../portfolio/application/repositories/transaction-fee.repository';
import type { TransactionRepository } from '../../../portfolio/application/repositories/transaction.repository';
import type { CreateBrokerUseCase } from '../../../portfolio/application/use-cases/create-broker.use-case';
import type { DeleteInitialBalanceDocumentUseCase } from '../../../portfolio/application/use-cases/delete-initial-balance-document.use-case';
import type { DeletePositionUseCase } from '../../../portfolio/application/use-cases/delete-position.use-case';
import type { ListAssetsUseCase } from '../../../portfolio/application/use-cases/list-assets.use-case';
import type { ListBrokersUseCase } from '../../../portfolio/application/use-cases/list-brokers.use-case';
import type { ListInitialBalanceDocumentsUseCase } from '../../../portfolio/application/use-cases/list-initial-balance-documents.use-case';
import type { ListPositionsUseCase } from '../../../portfolio/application/use-cases/list-positions.use-case';
import type { MigrateYearUseCase } from '../../../portfolio/application/use-cases/migrate-year.use-case';
import type { RecalculatePositionUseCase } from '../../../portfolio/application/use-cases/recalculate-position.use-case';
import type { RepairAssetTypeUseCase } from '../../../portfolio/application/use-cases/repair-asset-type.use-case';
import type { SaveInitialBalanceDocumentUseCase } from '../../../portfolio/application/use-cases/save-initial-balance-document.use-case';
import type { ToggleActiveBrokerUseCase } from '../../../portfolio/application/use-cases/toggle-active-broker.use-case';
import type { UpdateAssetUseCase } from '../../../portfolio/application/use-cases/update-asset.use-case';
import type { UpdateBrokerUseCase } from '../../../portfolio/application/use-cases/update-broker.use-case';
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

export interface BackendModule {
  startup?: {
    initialize(): void;
  };
}

export type AppModule = BackendModule;

export interface PortfolioModuleUseCases {
  createBrokerUseCase: CreateBrokerUseCase;
  listAssetsUseCase: ListAssetsUseCase;
  updateBrokerUseCase: UpdateBrokerUseCase;
  updateAssetUseCase: UpdateAssetUseCase;
  listBrokersUseCase: ListBrokersUseCase;
  toggleActiveBrokerUseCase: ToggleActiveBrokerUseCase;
  repairAssetTypeUseCase: RepairAssetTypeUseCase;
  saveInitialBalanceDocumentUseCase: SaveInitialBalanceDocumentUseCase;
  listInitialBalanceDocumentsUseCase: ListInitialBalanceDocumentsUseCase;
  deleteInitialBalanceDocumentUseCase: DeleteInitialBalanceDocumentUseCase;
  listPositionsUseCase: ListPositionsUseCase;
  recalculatePositionUseCase: RecalculatePositionUseCase;
  migrateYearUseCase: MigrateYearUseCase;
  importConsolidatedPositionUseCase: ImportConsolidatedPositionUseCase;
  deletePositionUseCase: DeletePositionUseCase;
}

export interface PortfolioModule extends BackendModule {
  exports: PortfolioModuleExports;
  useCases: PortfolioModuleUseCases;
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

export interface IngestionModule extends BackendModule {
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
  listMonthlyTaxHistoryUseCase: ListMonthlyTaxHistoryUseCase;
  getMonthlyTaxDetailUseCase: GetMonthlyTaxDetailUseCase;
  recalculateMonthlyTaxHistoryUseCase: RecalculateMonthlyTaxHistoryUseCase;
}

export interface TaxReportingModuleRepositories {
  monthlyTaxCloseRepository: MonthlyTaxCloseRepository;
  dailyBrokerTaxRepository: IngestionDailyBrokerTaxRepository;
}

export interface TaxReportingModule extends BackendModule {
  repositories: TaxReportingModuleRepositories;
  useCases: TaxReportingModuleUseCases;
}
