import { asClass, asValue, asFunction, createContainer, InjectionMode } from 'awilix';
import type { Knex } from 'knex';
import { KnexBrokerRepository } from '../../../portfolio/infra/repositories/knex-broker.repository';
import { KnexPositionRepository } from '../../../portfolio/infra/repositories/knex-position.repository';
import { KnexTransactionRepository } from '../../../portfolio/infra/repositories/knex-transaction.repository';
import { KnexAssetRepository } from '../../../portfolio/infra/repositories/knex-asset.repository';
import { MemoryQueueAdapter } from '../../../shared/infra/events/memory-queue.adapter';
import { TaxApportioner } from '../../../ingestion/domain/services/tax-apportioner.service';
import { SheetjsSpreadsheetFileReader } from '../../../ingestion/infra/file-readers/sheetjs.spreadsheet.file-reader';
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
  assetRepository: KnexAssetRepository;
  queue: MemoryQueueAdapter;
  taxApportioner: TaxApportioner;
  spreadsheetFileReader: SheetjsSpreadsheetFileReader;
  transactionParser: CsvXlsxTransactionParser;
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
    assetRepository: asClass(KnexAssetRepository).singleton(),
    queue: asClass(MemoryQueueAdapter).singleton(),
    taxApportioner: asClass(TaxApportioner).singleton(),
    spreadsheetFileReader: asClass(SheetjsSpreadsheetFileReader).singleton(),
    transactionParser: asClass(CsvXlsxTransactionParser)
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
          container.resolve('taxApportioner'),
          container.resolve('assetRepository'),
          container.resolve('transactionRepository'),
          container.resolve('queue'),
        ),
    ).singleton(),
    previewImportUseCase: asClass(PreviewImportUseCase)
      .inject(() => ({
        parser: container.resolve('transactionParser'),
        assetRepository: container.resolve('assetRepository'),
      }))
      .singleton(),
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
    repairAssetTypeUseCase: asClass(RepairAssetTypeUseCase).singleton(),

    // IPC registrars
    brokersIpcRegistrar: asClass(BrokersIpcRegistrar).singleton(),
    assetsIpcRegistrar: asClass(AssetsIpcRegistrar).singleton(),
    appIpcRegistrar: asClass(AppIpcRegistrar).singleton(),
    importIpcRegistrar: asClass(ImportIpcRegistrar).singleton(),
    portfolioIpcRegistrar: asClass(PortfolioIpcRegistrar).singleton(),
    reportIpcRegistrar: asClass(ReportIpcRegistrar).singleton(),

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
