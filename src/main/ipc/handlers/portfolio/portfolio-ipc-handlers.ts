import type { DeletePositionUseCase } from '../../../application/use-cases/delete-position/delete-position.use-case';
import type { ImportConsolidatedPositionUseCase } from '../../../application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import type { ListPositionsUseCase } from '../../../application/use-cases/list-positions/list-positions-use-case';
import type { MigrateYearUseCase } from '../../../application/use-cases/migrate-year/migrate-year.use-case';
import type { RecalculatePositionUseCase } from '../../../application/use-cases/recalculate-position/recalculate-position.use-case';
import type { SetInitialBalanceUseCase } from '../../../application/use-cases/set-initial-balance/set-initial-balance.use-case';
import type { IpcContractHandler } from '../../binding/bind-ipc-contract';
import type { AssetType } from '../../../../shared/types/domain';
import type {
  deletePositionContract,
  importConsolidatedPositionContract,
  listPositionsContract,
  migrateYearContract,
  previewConsolidatedPositionContract,
  recalculatePositionContract,
  setInitialBalanceContract,
} from '../../../../shared/ipc/contracts/portfolio';
import { ipcSuccess } from '../../../../shared/ipc/ipc-result';

export type PortfolioIpcHandlers = {
  setInitialBalance: IpcContractHandler<typeof setInitialBalanceContract>;
  listPositions: IpcContractHandler<typeof listPositionsContract>;
  recalculatePosition: IpcContractHandler<typeof recalculatePositionContract>;
  migrateYear: IpcContractHandler<typeof migrateYearContract>;
  previewConsolidatedPosition: IpcContractHandler<typeof previewConsolidatedPositionContract>;
  importConsolidatedPosition: IpcContractHandler<typeof importConsolidatedPositionContract>;
  deletePosition: IpcContractHandler<typeof deletePositionContract>;
};

export function createPortfolioIpcHandlers(
  setInitialBalanceUseCase: SetInitialBalanceUseCase,
  listPositionsUseCase: ListPositionsUseCase,
  recalculatePositionUseCase: RecalculatePositionUseCase,
  migrateYearUseCase: MigrateYearUseCase,
  importConsolidatedPositionUseCase: ImportConsolidatedPositionUseCase,
  deletePositionUseCase: DeletePositionUseCase,
): PortfolioIpcHandlers {
  return {
    setInitialBalance: async (payload) =>
      ipcSuccess(await setInitialBalanceUseCase.execute(payload)),
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
  };
}
