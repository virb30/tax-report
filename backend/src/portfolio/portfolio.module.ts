import type { Knex } from 'knex';
import type { SharedInfrastructure } from '../shared/application/shared-infrastructure';
import type { Http } from '../shared/infra/http/http.interface';
import type { AssetPositionRepository } from './application/repositories/asset-position.repository';
import type { AssetRepository } from './application/repositories/asset.repository';
import type { BrokerRepository } from './application/repositories/broker.repository';
import type { TransactionFeeRepository } from './application/repositories/transaction-fee.repository';
import type { TransactionRepository } from './application/repositories/transaction.repository';
import { InitialBalanceDocumentPositionSyncService } from './application/services/initial-balance-document-position-sync.service';
import { ReprocessTickerYearsService } from './application/services/reprocess-ticker-years.service';
import { CreateBrokerUseCase } from './application/use-cases/create-broker.use-case';
import { DeleteAllPositionsUseCase } from './application/use-cases/delete-all-positions.use-case';
import { DeleteInitialBalanceDocumentUseCase } from './application/use-cases/delete-initial-balance-document.use-case';
import { DeletePositionUseCase } from './application/use-cases/delete-position.use-case';
import { ListAssetsUseCase } from './application/use-cases/list-assets.use-case';
import { ListBrokersUseCase } from './application/use-cases/list-brokers.use-case';
import { ListInitialBalanceDocumentsUseCase } from './application/use-cases/list-initial-balance-documents.use-case';
import { ListPositionsUseCase } from './application/use-cases/list-positions.use-case';
import { MigrateYearUseCase } from './application/use-cases/migrate-year.use-case';
import { RecalculatePositionUseCase } from './application/use-cases/recalculate-position.use-case';
import { RepairAssetTypeUseCase } from './application/use-cases/repair-asset-type.use-case';
import { SaveInitialBalanceDocumentUseCase } from './application/use-cases/save-initial-balance-document.use-case';
import { ToggleActiveBrokerUseCase } from './application/use-cases/toggle-active-broker.use-case';
import { UpdateAssetUseCase } from './application/use-cases/update-asset.use-case';
import { UpdateBrokerUseCase } from './application/use-cases/update-broker.use-case';
import { KnexAssetRepository } from './infra/repositories/knex-asset.repository';
import { KnexBrokerRepository } from './infra/repositories/knex-broker.repository';
import { KnexPositionRepository } from './infra/repositories/knex-position.repository';
import { KnexTransactionFeeRepository } from './infra/repositories/knex-transaction-fee.repository';
import { KnexTransactionRepository } from './infra/repositories/knex-transaction.repository';
import { AssetController } from './transport/http/controllers/asset.controller';
import { BrokerController } from './transport/http/controllers/broker.controller';
import { InitialBalanceController } from './transport/http/controllers/initial-balance.controller';
import { PositionController } from './transport/http/controllers/position.controller';
import { RecalculatePositionHandler } from './transport/queue/handlers/recalculate-position.handler';

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
  deletePositionUseCase: DeletePositionUseCase;
  deleteAllPositionsUseCase: DeleteAllPositionsUseCase;
}

export interface PortfolioModuleExports {
  brokerRepository: BrokerRepository;
  positionRepository: AssetPositionRepository;
  transactionRepository: TransactionRepository;
  transactionFeeRepository: TransactionFeeRepository;
  assetRepository: AssetRepository;
}

export interface PortfolioModuleOverrides {
  repositories?: Partial<PortfolioModuleExports>;
  useCases?: Partial<PortfolioModuleUseCases>;
}

export interface PortfolioModuleInput {
  shared: SharedInfrastructure;
  http?: Http;
  overrides?: PortfolioModuleOverrides;
}

export class PortfolioModule {
  readonly exports: PortfolioModuleExports;
  private readonly useCases: PortfolioModuleUseCases;

  constructor(input: PortfolioModuleInput) {
    const repositories = this.createRepositories(
      input.shared.database,
      input.overrides?.repositories,
    );
    this.exports = repositories;
    this.useCases = this.createUseCases({
      shared: input.shared,
      repositories,
      overrides: input.overrides?.useCases,
    });

    if (input.http) {
      void new BrokerController(input.http, {
        listBrokersUseCase: this.useCases.listBrokersUseCase,
        createBrokerUseCase: this.useCases.createBrokerUseCase,
        updateBrokerUseCase: this.useCases.updateBrokerUseCase,
        toggleActiveBrokerUseCase: this.useCases.toggleActiveBrokerUseCase,
      });
      void new AssetController(input.http, {
        listAssetsUseCase: this.useCases.listAssetsUseCase,
        updateAssetUseCase: this.useCases.updateAssetUseCase,
        repairAssetTypeUseCase: this.useCases.repairAssetTypeUseCase,
      });
      void new InitialBalanceController(input.http, {
        listInitialBalanceDocumentsUseCase: this.useCases.listInitialBalanceDocumentsUseCase,
        saveInitialBalanceDocumentUseCase: this.useCases.saveInitialBalanceDocumentUseCase,
        deleteInitialBalanceDocumentUseCase: this.useCases.deleteInitialBalanceDocumentUseCase,
      });
      void new PositionController(input.http, {
        listPositionsUseCase: this.useCases.listPositionsUseCase,
        deletePositionUseCase: this.useCases.deletePositionUseCase,
        deleteAllPositionsUseCase: this.useCases.deleteAllPositionsUseCase,
        recalculatePositionUseCase: this.useCases.recalculatePositionUseCase,
        migrateYearUseCase: this.useCases.migrateYearUseCase,
      });
    }

    void new RecalculatePositionHandler(
      input.shared.queue,
      this.useCases.recalculatePositionUseCase,
    );
  }

  private createRepositories(
    database: Knex,
    overrides: Partial<PortfolioModuleExports> | undefined,
  ): PortfolioModuleExports {
    return {
      brokerRepository: overrides?.brokerRepository ?? new KnexBrokerRepository(database),
      positionRepository: overrides?.positionRepository ?? new KnexPositionRepository(database),
      transactionRepository:
        overrides?.transactionRepository ?? new KnexTransactionRepository(database),
      transactionFeeRepository:
        overrides?.transactionFeeRepository ?? new KnexTransactionFeeRepository(database),
      assetRepository: overrides?.assetRepository ?? new KnexAssetRepository(database),
    };
  }

  private createUseCases(input: {
    shared: SharedInfrastructure;
    repositories: PortfolioModuleExports;
    overrides: Partial<PortfolioModuleUseCases> | undefined;
  }): PortfolioModuleUseCases {
    const { shared, repositories, overrides } = input;
    const recalculatePositionUseCase =
      overrides?.recalculatePositionUseCase ??
      new RecalculatePositionUseCase(
        repositories.positionRepository,
        repositories.transactionRepository,
      );
    const initialBalanceDocumentPositionSyncService = new InitialBalanceDocumentPositionSyncService(
      repositories.positionRepository,
      repositories.transactionRepository,
    );
    const reprocessTickerYearsService = new ReprocessTickerYearsService(recalculatePositionUseCase);

    return {
      createBrokerUseCase:
        overrides?.createBrokerUseCase ?? new CreateBrokerUseCase(repositories.brokerRepository),
      listAssetsUseCase:
        overrides?.listAssetsUseCase ?? new ListAssetsUseCase(repositories.assetRepository),
      updateBrokerUseCase:
        overrides?.updateBrokerUseCase ?? new UpdateBrokerUseCase(repositories.brokerRepository),
      updateAssetUseCase:
        overrides?.updateAssetUseCase ?? new UpdateAssetUseCase(repositories.assetRepository),
      listBrokersUseCase:
        overrides?.listBrokersUseCase ?? new ListBrokersUseCase(repositories.brokerRepository),
      toggleActiveBrokerUseCase:
        overrides?.toggleActiveBrokerUseCase ??
        new ToggleActiveBrokerUseCase(repositories.brokerRepository),
      repairAssetTypeUseCase:
        overrides?.repairAssetTypeUseCase ??
        new RepairAssetTypeUseCase(
          repositories.assetRepository,
          repositories.transactionRepository,
          reprocessTickerYearsService,
          shared.queue,
        ),
      saveInitialBalanceDocumentUseCase:
        overrides?.saveInitialBalanceDocumentUseCase ??
        new SaveInitialBalanceDocumentUseCase(
          repositories.transactionRepository,
          initialBalanceDocumentPositionSyncService,
          repositories.assetRepository,
        ),
      listInitialBalanceDocumentsUseCase:
        overrides?.listInitialBalanceDocumentsUseCase ??
        new ListInitialBalanceDocumentsUseCase(
          repositories.transactionRepository,
          repositories.positionRepository,
          repositories.assetRepository,
        ),
      deleteInitialBalanceDocumentUseCase:
        overrides?.deleteInitialBalanceDocumentUseCase ??
        new DeleteInitialBalanceDocumentUseCase(
          repositories.transactionRepository,
          initialBalanceDocumentPositionSyncService,
        ),
      listPositionsUseCase:
        overrides?.listPositionsUseCase ??
        new ListPositionsUseCase(
          repositories.positionRepository,
          repositories.brokerRepository,
          repositories.assetRepository,
        ),
      recalculatePositionUseCase,
      migrateYearUseCase:
        overrides?.migrateYearUseCase ??
        new MigrateYearUseCase(repositories.positionRepository, repositories.transactionRepository),
      deletePositionUseCase:
        overrides?.deletePositionUseCase ??
        new DeletePositionUseCase(
          repositories.positionRepository,
          repositories.transactionRepository,
        ),
      deleteAllPositionsUseCase:
        overrides?.deleteAllPositionsUseCase ??
        new DeleteAllPositionsUseCase(
          repositories.positionRepository,
          repositories.transactionRepository,
        ),
    };
  }
}
