import type { AwilixContainer } from 'awilix';
import type { Knex } from 'knex';
import type { IpcRegistrar } from '../../../../ipc/main/registry/ipc-registrar';
import type { IpcRegistry } from '../../../../ipc/main/registry/ipc-registry';
import type { AppIpcRegistrar } from '../../transport/registrars/app-ipc-registrar';
import type { ImportTransactionsUseCase } from '../../../ingestion/application/use-cases/import-transactions.use-case';
import type { PreviewImportUseCase } from '../../../ingestion/application/use-cases/preview-import.use-case';
import type { ReallocateTransactionFeesService } from '../../../ingestion/application/services/reallocate-transaction-fees.service';
import type { DeleteDailyBrokerTaxUseCase } from '../../../ingestion/application/use-cases/delete-daily-broker-tax.use-case';
import type { ImportConsolidatedPositionUseCase } from '../../../ingestion/application/use-cases/import-consolidated-position.use-case';
import type { ImportDailyBrokerTaxesUseCase } from '../../../ingestion/application/use-cases/import-daily-broker-taxes.use-case';
import type { ListDailyBrokerTaxesUseCase } from '../../../ingestion/application/use-cases/list-daily-broker-taxes.use-case';
import type { SaveDailyBrokerTaxUseCase } from '../../../ingestion/application/use-cases/save-daily-broker-tax.use-case';
import type { SheetjsSpreadsheetFileReader } from '../../../ingestion/infra/file-readers/sheetjs.spreadsheet.file-reader';
import type { CsvXlsxConsolidatedPositionParser } from '../../../ingestion/infra/parsers/csv-xlsx-consolidated-position.parser';
import type { CsvXlsxDailyBrokerTaxParser } from '../../../ingestion/infra/parsers/csv-xlsx-daily-broker-tax.parser';
import type { CsvXlsxTransactionParser } from '../../../ingestion/infra/parsers/csv-xlsx-transaction.parser';
import type { KnexDailyBrokerTaxRepository } from '../../../ingestion/infra/repositories/knex-daily-broker-tax.repository';
import type { ImportIpcRegistrar } from '../../../ingestion/transport/registrars/import-ipc-registrar';
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
import type { InitialBalanceDocumentPositionSyncService } from '../../../portfolio/application/services/initial-balance-document-position-sync.service';
import type { ReprocessTickerYearsService } from '../../../portfolio/application/services/reprocess-ticker-years.service';
import type { TransactionFeeAllocator } from '../../../portfolio/domain/services/transaction-fee-allocator.service';
import type { RecalculatePositionHandler } from '../../../portfolio/infra/handlers/recalculate-position.handler';
import type { KnexAssetRepository } from '../../../portfolio/infra/repositories/knex-asset.repository';
import type { KnexBrokerRepository } from '../../../portfolio/infra/repositories/knex-broker.repository';
import type { KnexPositionRepository } from '../../../portfolio/infra/repositories/knex-position.repository';
import type { KnexTransactionFeeRepository } from '../../../portfolio/infra/repositories/knex-transaction-fee.repository';
import type { KnexTransactionRepository } from '../../../portfolio/infra/repositories/knex-transaction.repository';
import type { AssetsIpcRegistrar } from '../../../portfolio/transport/registrars/assets-ipc-registrar';
import type { BrokersIpcRegistrar } from '../../../portfolio/transport/registrars/brokers-ipc-registrar';
import type { PortfolioIpcRegistrar } from '../../../portfolio/transport/registrars/portfolio-ipc-registrar';
import type { MemoryQueueAdapter } from '../../../shared/infra/events/memory-queue.adapter';
import type { GenerateAssetsReportUseCase } from '../../../tax-reporting/application/use-cases/generate-assets-report.use-case';
import type { ReportIpcRegistrar } from '../../../tax-reporting/transport/registrars/report-ipc-registrar';

export interface AppCradle {
  database: Knex;
  queue: MemoryQueueAdapter;
  transactionFeeAllocator: TransactionFeeAllocator;

  brokerRepository: KnexBrokerRepository;
  positionRepository: KnexPositionRepository;
  transactionRepository: KnexTransactionRepository;
  transactionFeeRepository: KnexTransactionFeeRepository;
  assetRepository: KnexAssetRepository;
  dailyBrokerTaxRepository: KnexDailyBrokerTaxRepository;

  spreadsheetFileReader: SheetjsSpreadsheetFileReader;
  transactionParser: CsvXlsxTransactionParser;
  dailyBrokerTaxesParser: CsvXlsxDailyBrokerTaxParser;
  consolidatedPositionParser: CsvXlsxConsolidatedPositionParser;

  recalculatePositionHandler: RecalculatePositionHandler;
  initialBalanceDocumentPositionSyncService: InitialBalanceDocumentPositionSyncService;
  reprocessTickerYearsService: ReprocessTickerYearsService;
  reallocateTransactionFeesService: ReallocateTransactionFeesService;

  createBrokerUseCase: CreateBrokerUseCase;
  listAssetsUseCase: ListAssetsUseCase;
  updateBrokerUseCase: UpdateBrokerUseCase;
  updateAssetUseCase: UpdateAssetUseCase;
  listBrokersUseCase: ListBrokersUseCase;
  toggleActiveBrokerUseCase: ToggleActiveBrokerUseCase;
  recalculatePositionUseCase: RecalculatePositionUseCase;
  saveInitialBalanceDocumentUseCase: SaveInitialBalanceDocumentUseCase;
  listInitialBalanceDocumentsUseCase: ListInitialBalanceDocumentsUseCase;
  deleteInitialBalanceDocumentUseCase: DeleteInitialBalanceDocumentUseCase;
  listPositionsUseCase: ListPositionsUseCase;
  migrateYearUseCase: MigrateYearUseCase;
  deletePositionUseCase: DeletePositionUseCase;
  repairAssetTypeUseCase: RepairAssetTypeUseCase;

  importTransactionsUseCase: ImportTransactionsUseCase;
  previewImportUseCase: PreviewImportUseCase;
  listDailyBrokerTaxesUseCase: ListDailyBrokerTaxesUseCase;
  saveDailyBrokerTaxUseCase: SaveDailyBrokerTaxUseCase;
  importDailyBrokerTaxesUseCase: ImportDailyBrokerTaxesUseCase;
  deleteDailyBrokerTaxUseCase: DeleteDailyBrokerTaxUseCase;
  importConsolidatedPositionUseCase: ImportConsolidatedPositionUseCase;

  generateAssetsReportUseCase: GenerateAssetsReportUseCase;

  appIpcRegistrar: AppIpcRegistrar;
  brokersIpcRegistrar: BrokersIpcRegistrar;
  assetsIpcRegistrar: AssetsIpcRegistrar;
  importIpcRegistrar: ImportIpcRegistrar;
  portfolioIpcRegistrar: PortfolioIpcRegistrar;
  reportIpcRegistrar: ReportIpcRegistrar;
  ipcRegistrars: IpcRegistrar[];
  ipcRegistry: IpcRegistry;
}

export type MainContainer = AwilixContainer<AppCradle>;

export interface MainBootstrap {
  container: MainContainer;
  ipcRegistry: IpcRegistry;
}
