import { asClass, asFunction } from 'awilix';
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
import { AssetsIpcRegistrar } from '../../transport/registrars/assets-ipc-registrar';
import { BrokersIpcRegistrar } from '../../transport/registrars/brokers-ipc-registrar';
import { PortfolioIpcRegistrar } from '../../transport/registrars/portfolio-ipc-registrar';
import type { RecalculatePositionUseCase as RecalculatePositionUseCaseType } from '../../application/use-cases/recalculate-position.use-case';
import type { Queue } from '../../../shared/application/events/queue.interface';
import type { MainContainer } from '../../../app/infra/container';

export function registerPortfolioContext(container: MainContainer): void {
  container.register({
    brokerRepository: asClass(KnexBrokerRepository).singleton(),
    positionRepository: asClass(KnexPositionRepository).singleton(),
    transactionRepository: asClass(KnexTransactionRepository).singleton(),
    transactionFeeRepository: asClass(KnexTransactionFeeRepository).singleton(),
    assetRepository: asClass(KnexAssetRepository).singleton(),

    initialBalanceDocumentPositionSyncService: asClass(
      InitialBalanceDocumentPositionSyncService,
    ).singleton(),
    reprocessTickerYearsService: asClass(ReprocessTickerYearsService).singleton(),

    createBrokerUseCase: asClass(CreateBrokerUseCase).singleton(),
    listAssetsUseCase: asClass(ListAssetsUseCase).singleton(),
    updateBrokerUseCase: asClass(UpdateBrokerUseCase).singleton(),
    updateAssetUseCase: asClass(UpdateAssetUseCase).singleton(),
    listBrokersUseCase: asClass(ListBrokersUseCase).singleton(),
    toggleActiveBrokerUseCase: asClass(ToggleActiveBrokerUseCase).singleton(),
    recalculatePositionUseCase: asClass(RecalculatePositionUseCase).singleton(),
    saveInitialBalanceDocumentUseCase: asClass(SaveInitialBalanceDocumentUseCase).singleton(),
    listInitialBalanceDocumentsUseCase: asClass(ListInitialBalanceDocumentsUseCase).singleton(),
    deleteInitialBalanceDocumentUseCase: asClass(DeleteInitialBalanceDocumentUseCase).singleton(),
    listPositionsUseCase: asClass(ListPositionsUseCase).singleton(),
    migrateYearUseCase: asClass(MigrateYearUseCase).singleton(),
    deletePositionUseCase: asClass(DeletePositionUseCase).singleton(),
    repairAssetTypeUseCase: asClass(RepairAssetTypeUseCase).singleton(),

    recalculatePositionHandler: asFunction(
      (queue: Queue, recalculatePositionUseCase: RecalculatePositionUseCaseType) =>
        new RecalculatePositionHandler(queue, recalculatePositionUseCase),
    ).singleton(),

    brokersIpcRegistrar: asClass(BrokersIpcRegistrar).singleton(),
    assetsIpcRegistrar: asClass(AssetsIpcRegistrar).singleton(),
    portfolioIpcRegistrar: asClass(PortfolioIpcRegistrar).singleton(),
  });
}
