import type { IpcController, IpcMainHandleRegistry } from './ipc-controller.interface';
import type { SetInitialBalanceUseCase } from '../../application/use-cases/set-initial-balance/set-initial-balance.use-case';
import type { ListPositionsUseCase } from '../../application/use-cases/list-positions/list-positions-use-case';
import type { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position/recalculate-position.use-case';
import type { MigrateYearUseCase } from '../../application/use-cases/migrate-year/migrate-year.use-case';
import type { ImportConsolidatedPositionUseCase } from '../../application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import type { DeletePositionUseCase } from '../../application/use-cases/delete-position/delete-position.use-case';
import { bindIpcContract } from '../binding/bind-ipc-contract';
import { createPortfolioIpcHandlers } from '../handlers/portfolio/portfolio-ipc-handlers';
import {
  deletePositionContract,
  importConsolidatedPositionContract,
  listPositionsContract,
  migrateYearContract,
  portfolioIpcContracts,
  previewConsolidatedPositionContract,
  recalculatePositionContract,
  setInitialBalanceContract,
} from '../../../shared/ipc/contracts/portfolio';

export class PortfolioController implements IpcController {
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

    bindIpcContract(ipcMain, setInitialBalanceContract, handlers.setInitialBalance);
    bindIpcContract(ipcMain, listPositionsContract, handlers.listPositions);
    bindIpcContract(ipcMain, recalculatePositionContract, handlers.recalculatePosition);
    bindIpcContract(ipcMain, migrateYearContract, handlers.migrateYear);
    bindIpcContract(
      ipcMain,
      previewConsolidatedPositionContract,
      handlers.previewConsolidatedPosition,
    );
    bindIpcContract(
      ipcMain,
      importConsolidatedPositionContract,
      handlers.importConsolidatedPosition,
    );
    bindIpcContract(ipcMain, deletePositionContract, handlers.deletePosition);

    return portfolioIpcContracts.map((contract) => contract.channel);
  }
}
