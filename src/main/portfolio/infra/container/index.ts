import { InitialBalanceDocumentPositionSyncService } from '../../application/services/initial-balance-document-position-sync.service';
import { ReprocessTickerYearsService } from '../../application/services/reprocess-ticker-years.service';
import { CreateBrokerUseCase } from '../../application/use-cases/create-broker.use-case';
import { DeleteInitialBalanceDocumentUseCase } from '../../application/use-cases/delete-initial-balance-document.use-case';
import { DeletePositionUseCase } from '../../application/use-cases/delete-position.use-case';
import { ImportConsolidatedPositionUseCase } from '../../../ingestion/application/use-cases/import-consolidated-position.use-case';
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
import { CsvXlsxConsolidatedPositionParser } from '../../../ingestion/infra/parsers/csv-xlsx-consolidated-position.parser';
import { bindIpcContract } from '../../../../ipc/main/binding/bind-ipc-contract';
import {
  toIpcFailureResult,
  toIpcResultFailure,
} from '../../../../ipc/main/binding/ipc-error-mapper';
import {
  listAssetsContract,
  repairAssetTypeContract,
  updateAssetContract,
} from '../../../../ipc/contracts/portfolio/assets';
import {
  createBrokerContract,
  listBrokersContract,
  toggleBrokerActiveContract,
  updateBrokerContract,
} from '../../../../ipc/contracts/portfolio/brokers';
import {
  deleteAllPositionsContract,
  deleteInitialBalanceDocumentContract,
  deletePositionContract,
  importConsolidatedPositionContract,
  listInitialBalanceDocumentsContract,
  listPositionsContract,
  migrateYearContract,
  previewConsolidatedPositionContract,
  recalculatePositionContract,
  saveInitialBalanceDocumentContract,
} from '../../../../ipc/contracts/portfolio/portfolio';
import { ipcSuccess } from '../../../../ipc/ipc-result';
import type { AssetType } from '../../../shared/types/domain';
import type { IpcMainHandleRegistry } from '../../../../ipc/main/binding/ipc-main-handle-registry';
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

  const registerIpc = (ipcMain: IpcMainHandleRegistry): void =>
    registerPortfolioIpc(ipcMain, {
      listBrokersUseCase,
      createBrokerUseCase,
      updateBrokerUseCase,
      toggleActiveBrokerUseCase,
      listAssetsUseCase,
      updateAssetUseCase,
      repairAssetTypeUseCase,
      saveInitialBalanceDocumentUseCase,
      listInitialBalanceDocumentsUseCase,
      deleteInitialBalanceDocumentUseCase,
      listPositionsUseCase,
      recalculatePositionUseCase,
      migrateYearUseCase,
      importConsolidatedPositionUseCase,
      deletePositionUseCase,
    });

  let initialized = false;

  return {
    exports: {
      brokerRepository,
      positionRepository,
      transactionRepository,
      transactionFeeRepository,
      assetRepository,
    },
    registerIpc,
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

type BrokerIpcDependencies = {
  listBrokersUseCase: ListBrokersUseCase;
  createBrokerUseCase: CreateBrokerUseCase;
  updateBrokerUseCase: UpdateBrokerUseCase;
  toggleActiveBrokerUseCase: ToggleActiveBrokerUseCase;
};

type AssetIpcDependencies = {
  listAssetsUseCase: ListAssetsUseCase;
  updateAssetUseCase: UpdateAssetUseCase;
  repairAssetTypeUseCase: RepairAssetTypeUseCase;
};

type PortfolioFlowIpcDependencies = {
  saveInitialBalanceDocumentUseCase: SaveInitialBalanceDocumentUseCase;
  listInitialBalanceDocumentsUseCase: ListInitialBalanceDocumentsUseCase;
  deleteInitialBalanceDocumentUseCase: DeleteInitialBalanceDocumentUseCase;
  listPositionsUseCase: ListPositionsUseCase;
  recalculatePositionUseCase: RecalculatePositionUseCase;
  migrateYearUseCase: MigrateYearUseCase;
  importConsolidatedPositionUseCase: ImportConsolidatedPositionUseCase;
  deletePositionUseCase: DeletePositionUseCase;
};

type PortfolioIpcDependencies = BrokerIpcDependencies &
  AssetIpcDependencies &
  PortfolioFlowIpcDependencies;

function registerPortfolioIpc(
  ipcMain: IpcMainHandleRegistry,
  dependencies: PortfolioIpcDependencies,
): void {
  registerBrokerIpc(ipcMain, dependencies);
  registerAssetIpc(ipcMain, dependencies);
  registerPortfolioFlowIpc(ipcMain, dependencies);
}

function registerBrokerIpc(
  ipcMain: IpcMainHandleRegistry,
  dependencies: BrokerIpcDependencies,
): void {
  bindIpcContract(ipcMain, listBrokersContract, (payload) =>
    dependencies.listBrokersUseCase.execute(payload),
  );
  bindIpcContract(
    ipcMain,
    createBrokerContract,
    async (payload) => ({
      success: true as const,
      broker: await dependencies.createBrokerUseCase.execute(payload),
    }),
    {
      onError: (error) => {
        console.error(error);
        return toIpcFailureResult(error, 'Erro ao criar corretora.');
      },
    },
  );
  bindIpcContract(
    ipcMain,
    updateBrokerContract,
    async (payload) => ({
      success: true as const,
      broker: await dependencies.updateBrokerUseCase.execute(payload),
    }),
    {
      onError: (error) => {
        console.error(error);
        return toIpcFailureResult(error, 'Erro ao atualizar corretora.');
      },
    },
  );
  bindIpcContract(
    ipcMain,
    toggleBrokerActiveContract,
    async (payload) => ({
      success: true as const,
      broker: await dependencies.toggleActiveBrokerUseCase.execute(payload),
    }),
    {
      onError: (error) => {
        console.error(error);
        return toIpcFailureResult(error, 'Erro ao ativar/desativar corretora.');
      },
    },
  );
}

function registerAssetIpc(
  ipcMain: IpcMainHandleRegistry,
  dependencies: AssetIpcDependencies,
): void {
  bindIpcContract(ipcMain, listAssetsContract, (payload) =>
    dependencies.listAssetsUseCase.execute(payload),
  );
  bindIpcContract(
    ipcMain,
    updateAssetContract,
    async (payload) => ({
      success: true as const,
      asset: await dependencies.updateAssetUseCase.execute(payload),
    }),
    {
      onError: (error) => {
        console.error(error);
        return toIpcFailureResult(error, 'Erro ao atualizar ativo.');
      },
    },
  );
  bindIpcContract(
    ipcMain,
    repairAssetTypeContract,
    async (payload) => ({
      success: true as const,
      repair: await dependencies.repairAssetTypeUseCase.execute(payload),
    }),
    {
      onError: (error) => {
        console.error(error);
        return toIpcFailureResult(error, 'Erro ao corrigir tipo do ativo.');
      },
    },
  );
}

function registerPortfolioFlowIpc(
  ipcMain: IpcMainHandleRegistry,
  dependencies: PortfolioFlowIpcDependencies,
): void {
  bindIpcContract(
    ipcMain,
    saveInitialBalanceDocumentContract,
    async (payload) =>
      ipcSuccess(await dependencies.saveInitialBalanceDocumentUseCase.execute(payload)),
    { onError: toIpcResultFailure },
  );
  bindIpcContract(
    ipcMain,
    listInitialBalanceDocumentsContract,
    async (payload) =>
      ipcSuccess(await dependencies.listInitialBalanceDocumentsUseCase.execute(payload)),
    { onError: toIpcResultFailure },
  );
  bindIpcContract(
    ipcMain,
    deleteInitialBalanceDocumentContract,
    async (payload) =>
      ipcSuccess(await dependencies.deleteInitialBalanceDocumentUseCase.execute(payload)),
    { onError: toIpcResultFailure },
  );
  bindIpcContract(
    ipcMain,
    listPositionsContract,
    async (payload) => {
      const result = await dependencies.listPositionsUseCase.execute(payload);

      return ipcSuccess({
        items: result.items.map((item) => ({
          ...item,
          assetType: item.assetType as AssetType,
        })),
      });
    },
    { onError: toIpcResultFailure },
  );
  bindIpcContract(
    ipcMain,
    recalculatePositionContract,
    async (payload) => {
      await dependencies.recalculatePositionUseCase.execute(payload);
      return ipcSuccess(undefined);
    },
    { onError: toIpcResultFailure },
  );
  bindIpcContract(
    ipcMain,
    migrateYearContract,
    async (payload) => ipcSuccess(await dependencies.migrateYearUseCase.execute(payload)),
    { onError: toIpcResultFailure },
  );
  bindIpcContract(
    ipcMain,
    previewConsolidatedPositionContract,
    async (payload) =>
      ipcSuccess(await dependencies.importConsolidatedPositionUseCase.preview(payload)),
    { onError: toIpcResultFailure },
  );
  bindIpcContract(
    ipcMain,
    importConsolidatedPositionContract,
    async (payload) =>
      ipcSuccess(await dependencies.importConsolidatedPositionUseCase.execute(payload)),
    { onError: toIpcResultFailure },
  );
  bindIpcContract(
    ipcMain,
    deletePositionContract,
    async (payload) => ipcSuccess(await dependencies.deletePositionUseCase.execute(payload)),
    { onError: toIpcResultFailure },
  );
  bindIpcContract(
    ipcMain,
    deleteAllPositionsContract,
    async (payload) => ipcSuccess(await dependencies.deletePositionUseCase.executeAll(payload)),
    { onError: toIpcResultFailure },
  );
}
