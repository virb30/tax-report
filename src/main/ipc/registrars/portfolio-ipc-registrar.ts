import type { IpcMainHandleRegistry, IpcRegistrar } from '../registry/ipc-registrar';
import type { SetInitialBalanceUseCase } from '../../application/use-cases/set-initial-balance/set-initial-balance.use-case';
import type { ListPositionsUseCase } from '../../application/use-cases/list-positions/list-positions-use-case';
import type { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position/recalculate-position.use-case';
import type { MigrateYearUseCase } from '../../application/use-cases/migrate-year/migrate-year.use-case';
import type { ImportConsolidatedPositionUseCase } from '../../application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import type { DeletePositionUseCase } from '../../application/use-cases/delete-position/delete-position.use-case';
import { bindIpcContract } from '../binding/bind-ipc-contract';
import { toIpcResultFailure } from '../binding/ipc-error-mapper';
import { createPortfolioIpcHandlers } from '../handlers/portfolio/portfolio-ipc-handlers';
import {
  deleteAllPositionsContract,
  deletePositionContract,
  importConsolidatedPositionContract,
  listPositionsContract,
  migrateYearContract,
  portfolioIpcContracts,
  previewConsolidatedPositionContract,
  recalculatePositionContract,
  setInitialBalanceContract,
} from '../../../shared/ipc/contracts/portfolio/contracts';

export class PortfolioIpcRegistrar implements IpcRegistrar {
  constructor(
    private readonly setInitialBalanceUseCase: SetInitialBalanceUseCase,
    private readonly listPositionsUseCase: ListPositionsUseCase,
    private readonly recalculatePositionUseCase: RecalculatePositionUseCase,
    private readonly migrateYearUseCase: MigrateYearUseCase,
    private readonly importConsolidatedPositionUseCase: ImportConsolidatedPositionUseCase,
    private readonly deletePositionUseCase: DeletePositionUseCase,
  ) {}

  register(ipcMain: IpcMainHandleRegistry): string[] {
    const handlers = createPortfolioIpcHandlers(
      this.setInitialBalanceUseCase,
      this.listPositionsUseCase,
      this.recalculatePositionUseCase,
      this.migrateYearUseCase,
      this.importConsolidatedPositionUseCase,
      this.deletePositionUseCase,
    );

    bindIpcContract(ipcMain, setInitialBalanceContract, handlers.setInitialBalance, {
      onError: toIpcResultFailure,
    });
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
