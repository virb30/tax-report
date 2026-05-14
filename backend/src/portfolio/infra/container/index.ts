import { ImportConsolidatedPositionUseCase } from '../../../ingestion/application/use-cases/import-consolidated-position.use-case';
import { CsvXlsxConsolidatedPositionParser } from '../../../ingestion/infra/parsers/csv-xlsx-consolidated-position.parser';
import { InitialBalanceDocumentPositionSyncService } from '../../application/services/initial-balance-document-position-sync.service';
import { ReprocessTickerYearsService } from '../../application/services/reprocess-ticker-years.service';
import { CreateBrokerUseCase } from '../../application/use-cases/create-broker.use-case';
import { DeleteInitialBalanceDocumentUseCase } from '../../application/use-cases/delete-initial-balance-document.use-case';
import { DeletePositionUseCase } from '../../application/use-cases/delete-position.use-case';
import { ListAssetsUseCase } from '../../application/use-cases/list-assets.use-case';
import { ListBrokersUseCase } from '../../application/use-cases/list-brokers.use-case';
import { ListInitialBalanceDocumentsUseCase } from '../../application/use-cases/list-initial-balance-documents.use-case';
import { ListPositionsUseCase } from '../../application/use-cases/list-positions.use-case';
import { MigrateYearUseCase } from '../../application/use-cases/migrate-year.use-case';
import { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position.use-case';
import { RepairAssetTypeUseCase } from '../../application/use-cases/repair-asset-type.use-case';
import { SaveInitialBalanceDocumentUseCase } from '../../application/use-cases/save-initial-balance-document.use-case';
import { ToggleActiveBrokerUseCase } from '../../application/use-cases/toggle-active-broker.use-case';
import { UpdateAssetUseCase } from '../../application/use-cases/update-asset.use-case';
import { UpdateBrokerUseCase } from '../../application/use-cases/update-broker.use-case';
import { RecalculatePositionHandler } from '../handlers/recalculate-position.handler';
import { KnexAssetRepository } from '../repositories/knex-asset.repository';
import { KnexBrokerRepository } from '../repositories/knex-broker.repository';
import { KnexPositionRepository } from '../repositories/knex-position.repository';
import { KnexTransactionFeeRepository } from '../repositories/knex-transaction-fee.repository';
import { KnexTransactionRepository } from '../repositories/knex-transaction.repository';
import type { PortfolioModule, SharedInfrastructure } from '../../../app/infra/container';

export function createPortfolioModule(shared: SharedInfrastructure): PortfolioModule {
  const brokerRepository = new KnexBrokerRepository(shared.database);
  const positionRepository = new KnexPositionRepository(shared.database);
  const transactionRepository = new KnexTransactionRepository(shared.database);
  const transactionFeeRepository = new KnexTransactionFeeRepository(shared.database);
  const assetRepository = new KnexAssetRepository(shared.database);

  const recalculatePositionUseCase = new RecalculatePositionUseCase(
    positionRepository,
    transactionRepository,
  );
  const initialBalanceDocumentPositionSyncService = new InitialBalanceDocumentPositionSyncService(
    positionRepository,
    transactionRepository,
  );
  const reprocessTickerYearsService = new ReprocessTickerYearsService(recalculatePositionUseCase);
  const createBrokerUseCase = new CreateBrokerUseCase(brokerRepository);
  const listAssetsUseCase = new ListAssetsUseCase(assetRepository);
  const updateBrokerUseCase = new UpdateBrokerUseCase(brokerRepository);
  const updateAssetUseCase = new UpdateAssetUseCase(assetRepository);
  const listBrokersUseCase = new ListBrokersUseCase(brokerRepository);
  const toggleActiveBrokerUseCase = new ToggleActiveBrokerUseCase(brokerRepository);
  const repairAssetTypeUseCase = new RepairAssetTypeUseCase(
    assetRepository,
    transactionRepository,
    reprocessTickerYearsService,
    shared.queue,
  );
  const saveInitialBalanceDocumentUseCase = new SaveInitialBalanceDocumentUseCase(
    transactionRepository,
    initialBalanceDocumentPositionSyncService,
    assetRepository,
  );
  const listInitialBalanceDocumentsUseCase = new ListInitialBalanceDocumentsUseCase(
    transactionRepository,
    positionRepository,
    assetRepository,
  );
  const deleteInitialBalanceDocumentUseCase = new DeleteInitialBalanceDocumentUseCase(
    transactionRepository,
    initialBalanceDocumentPositionSyncService,
  );
  const listPositionsUseCase = new ListPositionsUseCase(
    positionRepository,
    brokerRepository,
    assetRepository,
  );
  const migrateYearUseCase = new MigrateYearUseCase(positionRepository, transactionRepository);
  const importConsolidatedPositionUseCase = new ImportConsolidatedPositionUseCase(
    new CsvXlsxConsolidatedPositionParser(),
    assetRepository,
    brokerRepository,
    transactionRepository,
    shared.queue,
  );
  const deletePositionUseCase = new DeletePositionUseCase(
    positionRepository,
    transactionRepository,
  );

  let initialized = false;

  return {
    exports: {
      brokerRepository,
      positionRepository,
      transactionRepository,
      transactionFeeRepository,
      assetRepository,
    },
    useCases: {
      createBrokerUseCase,
      listAssetsUseCase,
      updateBrokerUseCase,
      updateAssetUseCase,
      listBrokersUseCase,
      toggleActiveBrokerUseCase,
      repairAssetTypeUseCase,
      saveInitialBalanceDocumentUseCase,
      listInitialBalanceDocumentsUseCase,
      deleteInitialBalanceDocumentUseCase,
      listPositionsUseCase,
      recalculatePositionUseCase,
      migrateYearUseCase,
      importConsolidatedPositionUseCase,
      deletePositionUseCase,
    },
    startup: {
      initialize() {
        if (initialized) {
          return;
        }

        initialized = true;
        void new RecalculatePositionHandler(shared.queue, recalculatePositionUseCase);
      },
    },
  };
}
