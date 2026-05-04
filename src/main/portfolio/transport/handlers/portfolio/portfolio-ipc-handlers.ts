import type { DeleteInitialBalanceDocumentUseCase } from '../../../application/use-cases/delete-initial-balance-document/delete-initial-balance-document.use-case';
import type { DeletePositionUseCase } from '../../../application/use-cases/delete-position/delete-position.use-case';
import type { ImportConsolidatedPositionUseCase } from '../../../../ingestion/application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import type { ListInitialBalanceDocumentsUseCase } from '../../../application/use-cases/list-initial-balance-documents/list-initial-balance-documents.use-case';
import type { ListPositionsUseCase } from '../../../application/use-cases/list-positions/list-positions-use-case';
import type { MigrateYearUseCase } from '../../../application/use-cases/migrate-year/migrate-year.use-case';
import type { RecalculatePositionUseCase } from '../../../application/use-cases/recalculate-position/recalculate-position.use-case';
import type { SaveInitialBalanceDocumentUseCase } from '../../../application/use-cases/save-initial-balance-document/save-initial-balance-document.use-case';
import type { IpcContractHandler } from '../../../../../preload/main/binding/bind-ipc-contract';
import type { AssetType } from '../../../../../shared/types/domain';
import type {
  deleteInitialBalanceDocumentContract,
  deleteAllPositionsContract,
  deletePositionContract,
  importConsolidatedPositionContract,
  listInitialBalanceDocumentsContract,
  listPositionsContract,
  migrateYearContract,
  previewConsolidatedPositionContract,
  recalculatePositionContract,
  saveInitialBalanceDocumentContract,
} from '../../../../../preload/contracts/portfolio/portfolio';
import { ipcSuccess } from '../../../../../preload/ipc/ipc-result';

export type PortfolioIpcHandlers = {
  saveInitialBalanceDocument: IpcContractHandler<typeof saveInitialBalanceDocumentContract>;
  listInitialBalanceDocuments: IpcContractHandler<typeof listInitialBalanceDocumentsContract>;
  deleteInitialBalanceDocument: IpcContractHandler<typeof deleteInitialBalanceDocumentContract>;
  listPositions: IpcContractHandler<typeof listPositionsContract>;
  recalculatePosition: IpcContractHandler<typeof recalculatePositionContract>;
  migrateYear: IpcContractHandler<typeof migrateYearContract>;
  previewConsolidatedPosition: IpcContractHandler<typeof previewConsolidatedPositionContract>;
  importConsolidatedPosition: IpcContractHandler<typeof importConsolidatedPositionContract>;
  deletePosition: IpcContractHandler<typeof deletePositionContract>;
  deleteAllPositions: IpcContractHandler<typeof deleteAllPositionsContract>;
};

export function createPortfolioIpcHandlers(
  saveInitialBalanceDocumentUseCase: SaveInitialBalanceDocumentUseCase,
  listInitialBalanceDocumentsUseCase: ListInitialBalanceDocumentsUseCase,
  deleteInitialBalanceDocumentUseCase: DeleteInitialBalanceDocumentUseCase,
  listPositionsUseCase: ListPositionsUseCase,
  recalculatePositionUseCase: RecalculatePositionUseCase,
  migrateYearUseCase: MigrateYearUseCase,
  importConsolidatedPositionUseCase: ImportConsolidatedPositionUseCase,
  deletePositionUseCase: DeletePositionUseCase,
): PortfolioIpcHandlers {
  return {
    saveInitialBalanceDocument: async (payload) =>
      ipcSuccess(await saveInitialBalanceDocumentUseCase.execute(payload)),
    listInitialBalanceDocuments: async (payload) =>
      ipcSuccess(await listInitialBalanceDocumentsUseCase.execute(payload)),
    deleteInitialBalanceDocument: async (payload) =>
      ipcSuccess(await deleteInitialBalanceDocumentUseCase.execute(payload)),
    listPositions: async (payload) => {
      const result = await listPositionsUseCase.execute(payload);

      return ipcSuccess({
        items: result.items.map((item) => ({
          ...item,
          assetType: item.assetType as AssetType,
        })),
      });
    },
    recalculatePosition: async (payload) => {
      await recalculatePositionUseCase.execute(payload);
      return ipcSuccess(undefined);
    },
    migrateYear: async (payload) => ipcSuccess(await migrateYearUseCase.execute(payload)),
    previewConsolidatedPosition: async (payload) =>
      ipcSuccess(await importConsolidatedPositionUseCase.preview(payload)),
    importConsolidatedPosition: async (payload) =>
      ipcSuccess(await importConsolidatedPositionUseCase.execute(payload)),
    deletePosition: async (payload) => ipcSuccess(await deletePositionUseCase.execute(payload)),
    deleteAllPositions: async (payload) =>
      ipcSuccess(await deletePositionUseCase.executeAll(payload)),
  };
}
