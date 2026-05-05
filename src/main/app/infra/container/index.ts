import { asClass, asValue, asFunction, createContainer, InjectionMode } from 'awilix';
import type { Knex } from 'knex';
import { KnexBrokerRepository } from '../../../portfolio/infra/repositories/knex-broker.repository';
import { KnexPositionRepository } from '../../../portfolio/infra/repositories/knex-position.repository';
import { KnexTransactionRepository } from '../../../portfolio/infra/repositories/knex-transaction.repository';
import { KnexTransactionFeeRepository } from '../../../portfolio/infra/repositories/knex-transaction-fee.repository';
import { KnexAssetRepository } from '../../../portfolio/infra/repositories/knex-asset.repository';
import { KnexDailyBrokerTaxRepository } from '../../../ingestion/infra/repositories/knex-daily-broker-tax.repository';
import { MemoryQueueAdapter } from '../../../shared/infra/events/memory-queue.adapter';
import { TransactionFeeAllocator } from '../../../portfolio/domain/services/transaction-fee-allocator.service';
import { SheetjsSpreadsheetFileReader } from '../../../ingestion/infra/file-readers/sheetjs.spreadsheet.file-reader';
import { CsvXlsxDailyBrokerTaxParser } from '../../../ingestion/infra/parsers/csv-xlsx-daily-broker-tax.parser';
import { CsvXlsxTransactionParser } from '../../../ingestion/infra/parsers/csv-xlsx-transaction.parser';
import { CsvXlsxConsolidatedPositionParser } from '../../../ingestion/infra/parsers/csv-xlsx-consolidated-position.parser';
import { RecalculatePositionHandler } from '../../../portfolio/infra/handlers/recalculate-position.handler';

import { CreateBrokerUseCase } from '../../../portfolio/application/use-cases/create-broker/create-broker.use-case';
import { ListAssetsUseCase } from '../../../portfolio/application/use-cases/list-assets/list-assets.use-case';
import { UpdateBrokerUseCase } from '../../../portfolio/application/use-cases/update-broker/update-broker.use-case';
import { UpdateAssetUseCase } from '../../../portfolio/application/use-cases/update-asset/update-asset.use-case';
import { ListBrokersUseCase } from '../../../portfolio/application/use-cases/list-brokers/list-brokers.use-case';
import { ToggleActiveBrokerUseCase } from '../../../portfolio/application/use-cases/toggle-active-broker/toggle-active-broker.use-case';
import { RecalculatePositionUseCase } from '../../../portfolio/application/use-cases/recalculate-position/recalculate-position.use-case';
import { ImportTransactionsUseCase } from '../../../ingestion/application/use-cases/import-transactions/import-transactions-use-case';
import { PreviewImportUseCase } from '../../../ingestion/application/use-cases/preview-import/preview-import-use-case';
import { ReallocateTransactionFeesService } from '../../../ingestion/application/services/reallocate-transaction-fees.service';
import { DeleteDailyBrokerTaxUseCase } from '../../../ingestion/application/use-cases/delete-daily-broker-tax/delete-daily-broker-tax.use-case';
import { ImportDailyBrokerTaxesUseCase } from '../../../ingestion/application/use-cases/import-daily-broker-taxes/import-daily-broker-taxes.use-case';
import { ListDailyBrokerTaxesUseCase } from '../../../ingestion/application/use-cases/list-daily-broker-taxes/list-daily-broker-taxes.use-case';
import { SaveDailyBrokerTaxUseCase } from '../../../ingestion/application/use-cases/save-daily-broker-tax/save-daily-broker-tax.use-case';
import { DeleteInitialBalanceDocumentUseCase } from '../../../portfolio/application/use-cases/delete-initial-balance-document/delete-initial-balance-document.use-case';
import { ListPositionsUseCase } from '../../../portfolio/application/use-cases/list-positions/list-positions-use-case';
import { ListInitialBalanceDocumentsUseCase } from '../../../portfolio/application/use-cases/list-initial-balance-documents/list-initial-balance-documents.use-case';
import { MigrateYearUseCase } from '../../../portfolio/application/use-cases/migrate-year/migrate-year.use-case';
import { ImportConsolidatedPositionUseCase } from '../../../ingestion/application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import { DeletePositionUseCase } from '../../../portfolio/application/use-cases/delete-position/delete-position.use-case';
import { GenerateAssetsReportUseCase } from '../../../tax-reporting/application/use-cases/generate-asset-report/generate-assets-report.use-case';
import { SaveInitialBalanceDocumentUseCase } from '../../../portfolio/application/use-cases/save-initial-balance-document/save-initial-balance-document.use-case';
import { InitialBalanceDocumentPositionSyncService } from '../../../portfolio/application/services/initial-balance-document-position-sync.service';
import { ReprocessTickerYearsService } from '../../../portfolio/application/services/reprocess-ticker-years.service';
import { RepairAssetTypeUseCase } from '../../../portfolio/application/use-cases/repair-asset-type/repair-asset-type.use-case';
import { GenerateCapitalGainsAssessmentUseCase } from '../../../tax-reporting/application/use-cases/generate-capital-gains-assessment/generate-capital-gains-assessment.use-case';
import { KnexCapitalGainsAssessmentQuery } from '../../../tax-reporting/infra/queries/knex-capital-gains-assessment.query';
import { CapitalGainsAssessmentService } from '../../../tax-reporting/domain/capital-gains-assessment.service';
import { CapitalGainsLossCompensationService } from '../../../tax-reporting/domain/capital-gains-loss-compensation.service';

import { BrokersIpcRegistrar } from '../../../portfolio/transport/registrars/brokers-ipc-registrar';
import { AssetsIpcRegistrar } from '../../../portfolio/transport/registrars/assets-ipc-registrar';
import { AppIpcRegistrar } from '../../transport/registrars/app-ipc-registrar';
import { ImportIpcRegistrar } from '../../../ingestion/transport/registrars/import-ipc-registrar';
import { PortfolioIpcRegistrar } from '../../../portfolio/transport/registrars/portfolio-ipc-registrar';
import { ReportIpcRegistrar } from '../../../tax-reporting/transport/registrars/report-ipc-registrar';
import { IpcRegistry } from '../../../../preload/main/registry/ipc-registry';
import type { IpcRegistrar } from '../../../../preload/main/registry/ipc-registrar';

export interface AppCradle {
  database: Knex;
  brokerRepository: KnexBrokerRepository;
  positionRepository: KnexPositionRepository;
  transactionRepository: KnexTransactionRepository;
  transactionFeeRepository: KnexTransactionFeeRepository;
  assetRepository: KnexAssetRepository;
  dailyBrokerTaxRepository: KnexDailyBrokerTaxRepository;
  queue: MemoryQueueAdapter;
  transactionFeeAllocator: TransactionFeeAllocator;
  spreadsheetFileReader: SheetjsSpreadsheetFileReader;
  transactionParser: CsvXlsxTransactionParser;
  dailyBrokerTaxesParser: CsvXlsxDailyBrokerTaxParser;
  consolidatedPositionParser: CsvXlsxConsolidatedPositionParser;
  recalculatePositionHandler: RecalculatePositionHandler;

  createBrokerUseCase: CreateBrokerUseCase;
  listAssetsUseCase: ListAssetsUseCase;
  updateBrokerUseCase: UpdateBrokerUseCase;
  updateAssetUseCase: UpdateAssetUseCase;
  listBrokersUseCase: ListBrokersUseCase;
  toggleActiveBrokerUseCase: ToggleActiveBrokerUseCase;
  recalculatePositionUseCase: RecalculatePositionUseCase;
  importTransactionsUseCase: ImportTransactionsUseCase;
  previewImportUseCase: PreviewImportUseCase;
  reallocateTransactionFeesService: ReallocateTransactionFeesService;
  listDailyBrokerTaxesUseCase: ListDailyBrokerTaxesUseCase;
  saveDailyBrokerTaxUseCase: SaveDailyBrokerTaxUseCase;
  importDailyBrokerTaxesUseCase: ImportDailyBrokerTaxesUseCase;
  deleteDailyBrokerTaxUseCase: DeleteDailyBrokerTaxUseCase;
  initialBalanceDocumentPositionSyncService: InitialBalanceDocumentPositionSyncService;
  reprocessTickerYearsService: ReprocessTickerYearsService;
  saveInitialBalanceDocumentUseCase: SaveInitialBalanceDocumentUseCase;
  listInitialBalanceDocumentsUseCase: ListInitialBalanceDocumentsUseCase;
  deleteInitialBalanceDocumentUseCase: DeleteInitialBalanceDocumentUseCase;
  listPositionsUseCase: ListPositionsUseCase;
  migrateYearUseCase: MigrateYearUseCase;
  importConsolidatedPositionUseCase: ImportConsolidatedPositionUseCase;
  deletePositionUseCase: DeletePositionUseCase;
  generateAssetsReportUseCase: GenerateAssetsReportUseCase;
  generateCapitalGainsAssessmentUseCase: GenerateCapitalGainsAssessmentUseCase;
  capitalGainsAssessmentQuery: KnexCapitalGainsAssessmentQuery;
  capitalGainsAssessmentService: CapitalGainsAssessmentService;
  capitalGainsLossCompensationService: CapitalGainsLossCompensationService;
  repairAssetTypeUseCase: RepairAssetTypeUseCase;

  brokersIpcRegistrar: BrokersIpcRegistrar;
  assetsIpcRegistrar: AssetsIpcRegistrar;
  appIpcRegistrar: AppIpcRegistrar;
  importIpcRegistrar: ImportIpcRegistrar;
  portfolioIpcRegistrar: PortfolioIpcRegistrar;
  reportIpcRegistrar: ReportIpcRegistrar;

  ipcRegistrars: IpcRegistrar[];
  ipcRegistry: IpcRegistry;
}

export const container = createContainer<AppCradle>({
  injectionMode: InjectionMode.CLASSIC,
});

export function registerDependencies(db: Knex) {
  container.register({
    database: asValue(db),
    brokerRepository: asClass(KnexBrokerRepository).singleton(),
    positionRepository: asClass(KnexPositionRepository).singleton(),
    transactionRepository: asClass(KnexTransactionRepository).singleton(),
    transactionFeeRepository: asClass(KnexTransactionFeeRepository).singleton(),
    assetRepository: asClass(KnexAssetRepository).singleton(),
    dailyBrokerTaxRepository: asClass(KnexDailyBrokerTaxRepository).singleton(),
    queue: asClass(MemoryQueueAdapter).singleton(),
    transactionFeeAllocator: asClass(TransactionFeeAllocator).singleton(),
    spreadsheetFileReader: asClass(SheetjsSpreadsheetFileReader).singleton(),
    transactionParser: asClass(CsvXlsxTransactionParser)
      .inject(() => ({
        fileReader: container.resolve('spreadsheetFileReader'),
      }))
      .singleton(),
    dailyBrokerTaxesParser: asClass(CsvXlsxDailyBrokerTaxParser)
      .inject(() => ({
        fileReader: container.resolve('spreadsheetFileReader'),
      }))
      .singleton(),
    consolidatedPositionParser: asClass(CsvXlsxConsolidatedPositionParser).singleton(),

    // Handlers
    recalculatePositionHandler: asFunction(
      () =>
        new RecalculatePositionHandler(
          container.resolve('queue'),
          container.resolve('recalculatePositionUseCase'),
        ),
    ).singleton(),

    // Use Cases
    createBrokerUseCase: asClass(CreateBrokerUseCase).singleton(),
    listAssetsUseCase: asClass(ListAssetsUseCase).singleton(),
    updateBrokerUseCase: asClass(UpdateBrokerUseCase).singleton(),
    updateAssetUseCase: asClass(UpdateAssetUseCase).singleton(),
    listBrokersUseCase: asClass(ListBrokersUseCase).singleton(),
    toggleActiveBrokerUseCase: asClass(ToggleActiveBrokerUseCase).singleton(),
    recalculatePositionUseCase: asClass(RecalculatePositionUseCase).singleton(),
    importTransactionsUseCase: asFunction(
      () =>
        new ImportTransactionsUseCase(
          container.resolve('transactionParser'),
          container.resolve('assetRepository'),
          container.resolve('transactionRepository'),
          container.resolve('reallocateTransactionFeesService'),
          container.resolve('queue'),
        ),
    ).singleton(),
    previewImportUseCase: asClass(PreviewImportUseCase)
      .inject(() => ({
        parser: container.resolve('transactionParser'),
        transactionFeeAllocator: container.resolve('transactionFeeAllocator'),
        dailyBrokerTaxRepository: container.resolve('dailyBrokerTaxRepository'),
        assetRepository: container.resolve('assetRepository'),
      }))
      .singleton(),
    reallocateTransactionFeesService: asFunction(
      () =>
        new ReallocateTransactionFeesService(
          container.resolve('dailyBrokerTaxRepository'),
          container.resolve('transactionRepository'),
          container.resolve('transactionFeeRepository'),
          container.resolve('transactionFeeAllocator'),
        ),
    ).singleton(),
    listDailyBrokerTaxesUseCase: asClass(ListDailyBrokerTaxesUseCase).singleton(),
    saveDailyBrokerTaxUseCase: asFunction(
      () => 
        new SaveDailyBrokerTaxUseCase(
          container.resolve('dailyBrokerTaxRepository'),
          container.resolve('brokerRepository'),
          container.resolve('reallocateTransactionFeesService'),
          container.resolve('queue'),
        )
    ).singleton(),
    importDailyBrokerTaxesUseCase: asFunction(
      () => 
        new ImportDailyBrokerTaxesUseCase(
          container.resolve('dailyBrokerTaxesParser'),
          container.resolve('dailyBrokerTaxRepository'),
          container.resolve('reallocateTransactionFeesService'),
          container.resolve('queue'),
        )
    ).singleton(),
    deleteDailyBrokerTaxUseCase: asFunction(
      () => 
        new DeleteDailyBrokerTaxUseCase(
          container.resolve('dailyBrokerTaxRepository'),
          container.resolve('reallocateTransactionFeesService'),
          container.resolve('queue'),
        )
    ).singleton(),
    initialBalanceDocumentPositionSyncService: asClass(
      InitialBalanceDocumentPositionSyncService,
    ).singleton(),
    reprocessTickerYearsService: asClass(ReprocessTickerYearsService).singleton(),
    saveInitialBalanceDocumentUseCase: asClass(SaveInitialBalanceDocumentUseCase).singleton(),
    listInitialBalanceDocumentsUseCase: asClass(ListInitialBalanceDocumentsUseCase).singleton(),
    deleteInitialBalanceDocumentUseCase: asClass(DeleteInitialBalanceDocumentUseCase).singleton(),
    listPositionsUseCase: asClass(ListPositionsUseCase).singleton(),
    migrateYearUseCase: asClass(MigrateYearUseCase).singleton(),
    importConsolidatedPositionUseCase: asFunction(
      () =>
        new ImportConsolidatedPositionUseCase(
          container.resolve('consolidatedPositionParser'),
          container.resolve('assetRepository'),
          container.resolve('brokerRepository'),
          container.resolve('transactionRepository'),
          container.resolve('queue'),
        ),
    ).singleton(),
    deletePositionUseCase: asClass(DeletePositionUseCase).singleton(),
    generateAssetsReportUseCase: asClass(GenerateAssetsReportUseCase).singleton(),
    capitalGainsAssessmentQuery: asClass(KnexCapitalGainsAssessmentQuery).singleton(),
    capitalGainsAssessmentService: asClass(CapitalGainsAssessmentService).singleton(),
    capitalGainsLossCompensationService: asClass(CapitalGainsLossCompensationService).singleton(),
    generateCapitalGainsAssessmentUseCase: asClass(GenerateCapitalGainsAssessmentUseCase)
      .inject(() => ({
        query: container.resolve('capitalGainsAssessmentQuery'),
        assessmentService: container.resolve('capitalGainsAssessmentService'),
        lossCompensationService: container.resolve('capitalGainsLossCompensationService'),
      }))
      .singleton(),
    repairAssetTypeUseCase: asClass(RepairAssetTypeUseCase).singleton(),

    // IPC registrars
    brokersIpcRegistrar: asClass(BrokersIpcRegistrar).singleton(),
    assetsIpcRegistrar: asClass(AssetsIpcRegistrar).singleton(),
    appIpcRegistrar: asClass(AppIpcRegistrar).singleton(),
    importIpcRegistrar: asClass(ImportIpcRegistrar).singleton(),
    portfolioIpcRegistrar: asClass(PortfolioIpcRegistrar).singleton(),
    reportIpcRegistrar: asClass(ReportIpcRegistrar)
      .inject(() => ({
        generateAssetsReportUseCase: container.resolve('generateAssetsReportUseCase'),
        generateCapitalGainsAssessmentUseCase: container.resolve(
          'generateCapitalGainsAssessmentUseCase',
        ),
      }))
      .singleton(),

    // IPC
    ipcRegistrars: asFunction(
      (
        brokersIpcRegistrar: BrokersIpcRegistrar,
        assetsIpcRegistrar: AssetsIpcRegistrar,
        appIpcRegistrar: AppIpcRegistrar,
        importIpcRegistrar: ImportIpcRegistrar,
        portfolioIpcRegistrar: PortfolioIpcRegistrar,
        reportIpcRegistrar: ReportIpcRegistrar,
      ) => [
        brokersIpcRegistrar,
        assetsIpcRegistrar,
        appIpcRegistrar,
        importIpcRegistrar,
        portfolioIpcRegistrar,
        reportIpcRegistrar,
      ],
    ).singleton(),
    ipcRegistry: asClass(IpcRegistry).singleton(),
  });

  container.resolve('recalculatePositionHandler');
}
