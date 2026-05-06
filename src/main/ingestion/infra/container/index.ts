import { asClass, asFunction } from 'awilix';
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
import { ImportIpcRegistrar } from '../../transport/registrars/import-ipc-registrar';
import type { DailyBrokerTaxRepository } from '../../application/repositories/daily-broker-tax.repository';
import type { DailyBrokerTaxesParser } from '../../application/interfaces/daily-broker-taxes.parser.interface';
import type { ImportTransactionsParser } from '../../application/interfaces/transactions.parser.interface';
import type { ConsolidatedPositionParserPort } from '../../application/interfaces/consolidated-position-parser.port';
import type { SpreadsheetFileReader } from '../../application/interfaces/spreadsheet.file-reader';
import type { AssetRepository } from '../../../portfolio/application/repositories/asset.repository';
import type { BrokerRepository } from '../../../portfolio/application/repositories/broker.repository';
import type { TransactionRepository } from '../../../portfolio/application/repositories/transaction.repository';
import type { TransactionFeeRepository } from '../../../portfolio/application/repositories/transaction-fee.repository';
import type { TransactionFeeAllocator } from '../../../portfolio/domain/services/transaction-fee-allocator.service';
import type { Queue } from '../../../shared/application/events/queue.interface';
import type { MainContainer } from '../../../app/infra/container';

export function registerIngestionContext(container: MainContainer): void {
  container.register({
    dailyBrokerTaxRepository: asClass(KnexDailyBrokerTaxRepository).singleton(),

    spreadsheetFileReader: asClass(SheetjsSpreadsheetFileReader).singleton(),
    transactionParser: asFunction(
      (spreadsheetFileReader: SpreadsheetFileReader, brokerRepository: BrokerRepository) =>
        new CsvXlsxTransactionParser(spreadsheetFileReader, brokerRepository),
    ).singleton(),
    dailyBrokerTaxesParser: asFunction(
      (spreadsheetFileReader: SpreadsheetFileReader, brokerRepository: BrokerRepository) =>
        new CsvXlsxDailyBrokerTaxParser(spreadsheetFileReader, brokerRepository),
    ).singleton(),
    consolidatedPositionParser: asClass(CsvXlsxConsolidatedPositionParser).singleton(),

    reallocateTransactionFeesService: asFunction(
      (
        dailyBrokerTaxRepository: DailyBrokerTaxRepository,
        transactionRepository: TransactionRepository,
        transactionFeeRepository: TransactionFeeRepository,
        transactionFeeAllocator: TransactionFeeAllocator,
      ) =>
        new ReallocateTransactionFeesService(
          dailyBrokerTaxRepository,
          transactionRepository,
          transactionFeeRepository,
          transactionFeeAllocator,
        ),
    ).singleton(),
    importTransactionsUseCase: asFunction(
      (
        transactionParser: ImportTransactionsParser,
        assetRepository: AssetRepository,
        transactionRepository: TransactionRepository,
        reallocateTransactionFeesService: ReallocateTransactionFeesService,
        queue: Queue,
      ) =>
        new ImportTransactionsUseCase(
          transactionParser,
          assetRepository,
          transactionRepository,
          reallocateTransactionFeesService,
          queue,
        ),
    ).singleton(),
    previewImportUseCase: asFunction(
      (
        transactionParser: ImportTransactionsParser,
        transactionFeeAllocator: TransactionFeeAllocator,
        dailyBrokerTaxRepository: DailyBrokerTaxRepository,
        assetRepository: AssetRepository,
      ) =>
        new PreviewImportUseCase(
          transactionParser,
          transactionFeeAllocator,
          dailyBrokerTaxRepository,
          assetRepository,
        ),
    ).singleton(),
    listDailyBrokerTaxesUseCase: asClass(ListDailyBrokerTaxesUseCase).singleton(),
    saveDailyBrokerTaxUseCase: asClass(SaveDailyBrokerTaxUseCase).singleton(),
    importDailyBrokerTaxesUseCase: asFunction(
      (
        dailyBrokerTaxesParser: DailyBrokerTaxesParser,
        dailyBrokerTaxRepository: DailyBrokerTaxRepository,
        reallocateTransactionFeesService: ReallocateTransactionFeesService,
        queue: Queue,
      ) =>
        new ImportDailyBrokerTaxesUseCase(
          dailyBrokerTaxesParser,
          dailyBrokerTaxRepository,
          reallocateTransactionFeesService,
          queue,
        ),
    ).singleton(),
    deleteDailyBrokerTaxUseCase: asClass(DeleteDailyBrokerTaxUseCase).singleton(),
    importConsolidatedPositionUseCase: asFunction(
      (
        consolidatedPositionParser: ConsolidatedPositionParserPort,
        assetRepository: AssetRepository,
        brokerRepository: BrokerRepository,
        transactionRepository: TransactionRepository,
        queue: Queue,
      ) =>
        new ImportConsolidatedPositionUseCase(
          consolidatedPositionParser,
          assetRepository,
          brokerRepository,
          transactionRepository,
          queue,
        ),
    ).singleton(),

    importIpcRegistrar: asClass(ImportIpcRegistrar).singleton(),
  });
}
