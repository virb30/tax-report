import { mock, mockReset } from 'jest-mock-extended';
import { AppError } from '../../../shared/app-error';
import type { DeletePositionUseCase } from '../../application/use-cases/delete-position/delete-position.use-case';
import type { ImportConsolidatedPositionUseCase } from '../../application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import type { ListPositionsUseCase } from '../../application/use-cases/list-positions/list-positions-use-case';
import type { MigrateYearUseCase } from '../../application/use-cases/migrate-year/migrate-year.use-case';
import type { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position/recalculate-position.use-case';
import type { SetInitialBalanceUseCase } from '../../application/use-cases/set-initial-balance/set-initial-balance.use-case';
import {
  portfolioIpcContracts,
  setInitialBalanceContract,
} from '../../../shared/ipc/contracts/portfolio';
import { AssetType } from '../../../shared/types/domain';
import type { IpcMainHandleRegistry } from '../registry/ipc-registrar';
import { PortfolioIpcRegistrar } from './portfolio-ipc-registrar';

type IpcHandler = (_event: Electron.IpcMainInvokeEvent, input?: unknown) => Promise<unknown>;

describe('PortfolioIpcRegistrar', () => {
  const setInitialBalanceUseCase = mock<SetInitialBalanceUseCase>();
  const listPositionsUseCase = mock<ListPositionsUseCase>();
  const recalculatePositionUseCase = mock<RecalculatePositionUseCase>();
  const migrateYearUseCase = mock<MigrateYearUseCase>();
  const importConsolidatedPositionUseCase = mock<ImportConsolidatedPositionUseCase>();
  const deletePositionUseCase = mock<DeletePositionUseCase>();
  const ipcEvent = {} as Electron.IpcMainInvokeEvent;

  beforeEach(() => {
    mockReset(setInitialBalanceUseCase);
    mockReset(listPositionsUseCase);
    mockReset(recalculatePositionUseCase);
    mockReset(migrateYearUseCase);
    mockReset(importConsolidatedPositionUseCase);
    mockReset(deletePositionUseCase);
  });

  function registerRegistrar(): Map<string, IpcHandler> {
    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel, listener) => {
        handlers.set(channel, listener as IpcHandler);
      },
    };

    const registrar = new PortfolioIpcRegistrar(
      setInitialBalanceUseCase,
      listPositionsUseCase,
      recalculatePositionUseCase,
      migrateYearUseCase,
      importConsolidatedPositionUseCase,
      deletePositionUseCase,
    );

    expect(registrar.register(ipcMain)).toEqual(
      portfolioIpcContracts.map((contract) => contract.channel),
    );

    return handlers;
  }

  it('maps a use-case failure to an ok false result through the shared mapper', async () => {
    setInitialBalanceUseCase.execute.mockRejectedValue(
      new AppError('INITIAL_BALANCE_CONFLICT', 'Saldo inicial duplicado.', 'conflict', {
        ticker: 'PETR4',
      }),
    );
    const handlers = registerRegistrar();
    const setInitialBalanceHandler = handlers.get(setInitialBalanceContract.channel);

    await expect(
      setInitialBalanceHandler?.(ipcEvent, {
        ticker: 'PETR4',
        brokerId: 'broker-xp',
        assetType: AssetType.Stock,
        quantity: 10,
        averagePrice: 30,
        year: 2025,
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'INITIAL_BALANCE_CONFLICT',
        message: 'Saldo inicial duplicado.',
        kind: 'conflict',
        details: { ticker: 'PETR4' },
      },
    });
  });

  it('registers every portfolio contract channel', () => {
    const handlers = registerRegistrar();

    expect([...handlers.keys()]).toEqual(portfolioIpcContracts.map((contract) => contract.channel));
  });
});
