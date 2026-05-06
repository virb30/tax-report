import type {
  IpcMainHandleRegistry,
  IpcRegistrar,
} from '../../../../preload/main/registry/ipc-registrar';
import type { DeleteInitialBalanceDocumentUseCase } from '../../application/use-cases/delete-initial-balance-document.use-case';
import type { ListInitialBalanceDocumentsUseCase } from '../../application/use-cases/list-initial-balance-documents.use-case';
import type { ListPositionsUseCase } from '../../application/use-cases/list-positions.use-case';
import type { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position.use-case';
import type { MigrateYearUseCase } from '../../application/use-cases/migrate-year.use-case';
import type { ImportConsolidatedPositionUseCase } from '../../../ingestion/application/use-cases/import-consolidated-position.use-case';
import type { DeletePositionUseCase } from '../../application/use-cases/delete-position.use-case';
import type { SaveInitialBalanceDocumentUseCase } from '../../application/use-cases/save-initial-balance-document.use-case';
import { bindIpcContract } from '../../../../preload/main/binding/bind-ipc-contract';
import { toIpcResultFailure } from '../../../../preload/main/binding/ipc-error-mapper';
import { createPortfolioIpcHandlers } from '../handlers/portfolio/portfolio-ipc-handlers';
import {
  deleteInitialBalanceDocumentContract,
  deleteAllPositionsContract,
  deletePositionContract,
  importConsolidatedPositionContract,
  listInitialBalanceDocumentsContract,
  listPositionsContract,
  migrateYearContract,
  portfolioIpcContracts,
  previewConsolidatedPositionContract,
  recalculatePositionContract,
  saveInitialBalanceDocumentContract,
} from '../../../../preload/contracts/portfolio/portfolio/contracts';

export class PortfolioIpcRegistrar implements IpcRegistrar {
  constructor(
    private readonly saveInitialBalanceDocumentUseCase: SaveInitialBalanceDocumentUseCase,
    private readonly listInitialBalanceDocumentsUseCase: ListInitialBalanceDocumentsUseCase,
    private readonly deleteInitialBalanceDocumentUseCase: DeleteInitialBalanceDocumentUseCase,
    private readonly listPositionsUseCase: ListPositionsUseCase,
    private readonly recalculatePositionUseCase: RecalculatePositionUseCase,
    private readonly migrateYearUseCase: MigrateYearUseCase,
    private readonly importConsolidatedPositionUseCase: ImportConsolidatedPositionUseCase,
    private readonly deletePositionUseCase: DeletePositionUseCase,
  ) {}

  register(ipcMain: IpcMainHandleRegistry): string[] {
    const handlers = createPortfolioIpcHandlers(
      this.saveInitialBalanceDocumentUseCase,
      this.listInitialBalanceDocumentsUseCase,
      this.deleteInitialBalanceDocumentUseCase,
      this.listPositionsUseCase,
      this.recalculatePositionUseCase,
      this.migrateYearUseCase,
      this.importConsolidatedPositionUseCase,
      this.deletePositionUseCase,
    );

    bindIpcContract(
      ipcMain,
      saveInitialBalanceDocumentContract,
      handlers.saveInitialBalanceDocument,
      {
        onError: toIpcResultFailure,
      },
    );
    bindIpcContract(
      ipcMain,
      listInitialBalanceDocumentsContract,
      handlers.listInitialBalanceDocuments,
      {
        onError: toIpcResultFailure,
      },
    );
    bindIpcContract(
      ipcMain,
      deleteInitialBalanceDocumentContract,
      handlers.deleteInitialBalanceDocument,
      {
        onError: toIpcResultFailure,
      },
    );
    bindIpcContract(ipcMain, listPositionsContract, handlers.listPositions, {
      onError: toIpcResultFailure,
    });
    bindIpcContract(ipcMain, recalculatePositionContract, handlers.recalculatePosition, {
      onError: toIpcResultFailure,
    });
    bindIpcContract(ipcMain, migrateYearContract, handlers.migrateYear, {
      onError: toIpcResultFailure,
    });
    bindIpcContract(
      ipcMain,
      previewConsolidatedPositionContract,
      handlers.previewConsolidatedPosition,
      {
        onError: toIpcResultFailure,
      },
    );
    bindIpcContract(
      ipcMain,
      importConsolidatedPositionContract,
      handlers.importConsolidatedPosition,
      {
        onError: toIpcResultFailure,
      },
    );
    bindIpcContract(ipcMain, deletePositionContract, handlers.deletePosition, {
      onError: toIpcResultFailure,
    });
    bindIpcContract(ipcMain, deleteAllPositionsContract, handlers.deleteAllPositions, {
      onError: toIpcResultFailure,
    });

    return portfolioIpcContracts.map((contract) => contract.channel);
  }
}
