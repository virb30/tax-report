import { asClass, asValue, asFunction, createContainer, InjectionMode } from 'awilix';
import { Knex } from 'knex';
import { KnexBrokerRepository } from '../repositories/knex-broker.repository';
import { KnexPositionRepository } from '../repositories/knex-position.repository';
import { KnexTransactionRepository } from '../repositories/knex-transaction.repository';
import { KnexAssetRepository } from '../repositories/knex-asset.repository';
import { MemoryQueueAdapter } from '../events/memory-queue.adapter';
import { TaxApportioner } from '../../domain/ingestion/tax-apportioner.service';
import { SheetjsSpreadsheetFileReader } from '../adapters/file-readers/sheetjs.spreadsheet.file-reader';
import { CsvXlsxTransactionParser } from '../parsers/csv-xlsx-transaction.parser';
import { CsvXlsxConsolidatedPositionParser } from '../parsers/csv-xlsx-consolidated-position.parser';
import { RecalculatePositionHandler } from '../handlers/recalculate-position.handler';

import { CreateBrokerUseCase } from '../../application/use-cases/create-broker/create-broker.use-case';
import { UpdateBrokerUseCase } from '../../application/use-cases/update-broker/update-broker.use-case';
import { ListBrokersUseCase } from '../../application/use-cases/list-brokers/list-brokers.use-case';
import { ToggleActiveBrokerUseCase } from '../../application/use-cases/toggle-active-broker/toggle-active-broker.use-case';
import { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position/recalculate-position.use-case';
import { ImportTransactionsUseCase } from '../../application/use-cases/import-transactions/import-transactions-use-case';
import { PreviewImportUseCase } from '../../application/use-cases/preview-import/preview-import-use-case';
import { SetInitialBalanceUseCase } from '../../application/use-cases/set-initial-balance/set-initial-balance.use-case';
import { ListPositionsUseCase } from '../../application/use-cases/list-positions/list-positions-use-case';
import { MigrateYearUseCase } from '../../application/use-cases/migrate-year/migrate-year.use-case';
import { ImportConsolidatedPositionUseCase } from '../../application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import { DeletePositionUseCase } from '../../application/use-cases/delete-position/delete-position.use-case';
import { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-asset-report/generate-assets-report.use-case';

import { BrokersController } from '../../ipc/controllers/brokers.controller';

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
  updateBrokerUseCase: UpdateBrokerUseCase;
  listBrokersUseCase: ListBrokersUseCase;
  toggleActiveBrokerUseCase: ToggleActiveBrokerUseCase;
  recalculatePositionUseCase: RecalculatePositionUseCase;
  importTransactionsUseCase: ImportTransactionsUseCase;
  previewImportUseCase: PreviewImportUseCase;
  setInitialBalanceUseCase: SetInitialBalanceUseCase;
  listPositionsUseCase: ListPositionsUseCase;
  migrateYearUseCase: MigrateYearUseCase;
  importConsolidatedPositionUseCase: ImportConsolidatedPositionUseCase;
  deletePositionUseCase: DeletePositionUseCase;
  generateAssetsReportUseCase: GenerateAssetsReportUseCase;
  
  brokersController: BrokersController;
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
    transactionParser: asClass(CsvXlsxTransactionParser).inject(() => ({
      fileReader: container.resolve('spreadsheetFileReader'),
    })).singleton(),
    consolidatedPositionParser: asClass(CsvXlsxConsolidatedPositionParser).singleton(),
    
    // Handlers
    recalculatePositionHandler: asFunction(() => new RecalculatePositionHandler(
      container.resolve('queue'),
      container.resolve('recalculatePositionUseCase')
    )).singleton(),

    // Use Cases
    createBrokerUseCase: asClass(CreateBrokerUseCase).singleton(),
    updateBrokerUseCase: asClass(UpdateBrokerUseCase).singleton(),
    listBrokersUseCase: asClass(ListBrokersUseCase).singleton(),
    toggleActiveBrokerUseCase: asClass(ToggleActiveBrokerUseCase).singleton(),
    recalculatePositionUseCase: asClass(RecalculatePositionUseCase).singleton(),
    importTransactionsUseCase: asFunction(() => new ImportTransactionsUseCase(
      container.resolve('transactionParser'),
      container.resolve('taxApportioner'),
      container.resolve('transactionRepository'),
      container.resolve('queue')
    )).singleton(),
    previewImportUseCase: asClass(PreviewImportUseCase).inject(() => ({
      parser: container.resolve('transactionParser'),
    })).singleton(),
    setInitialBalanceUseCase: asClass(SetInitialBalanceUseCase).singleton(),
    listPositionsUseCase: asClass(ListPositionsUseCase).singleton(),
    migrateYearUseCase: asClass(MigrateYearUseCase).singleton(),
    importConsolidatedPositionUseCase: asFunction(() => new ImportConsolidatedPositionUseCase(
      container.resolve('consolidatedPositionParser'),
      container.resolve('brokerRepository'),
      container.resolve('transactionRepository'),
      container.resolve('queue')
    )).singleton(),
    deletePositionUseCase: asClass(DeletePositionUseCase).singleton(),
    generateAssetsReportUseCase: asClass(GenerateAssetsReportUseCase).inject(() => ({
      tickerDataRepository: container.resolve('assetRepository'),
    })).singleton(),
    
    // Controllers
    brokersController: asClass(BrokersController).singleton(),
  });

  container.resolve('recalculatePositionHandler');
}