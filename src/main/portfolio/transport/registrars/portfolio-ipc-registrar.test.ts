import { mock, mockReset } from 'jest-mock-extended';
import { AppError } from '../../../shared/app-error';
import type { DeleteInitialBalanceDocumentUseCase } from '../../application/use-cases/delete-initial-balance-document/delete-initial-balance-document.use-case';
import type { DeletePositionUseCase } from '../../application/use-cases/delete-position/delete-position.use-case';
import type { ImportConsolidatedPositionUseCase } from '../../../ingestion/application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import type { ListInitialBalanceDocumentsUseCase } from '../../application/use-cases/list-initial-balance-documents/list-initial-balance-documents.use-case';
import type { ListPositionsUseCase } from '../../application/use-cases/list-positions/list-positions-use-case';
import type { MigrateYearUseCase } from '../../application/use-cases/migrate-year/migrate-year.use-case';
import type { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position/recalculate-position.use-case';
import type { SaveInitialBalanceDocumentUseCase } from '../../application/use-cases/save-initial-balance-document/save-initial-balance-document.use-case';
import {
  portfolioIpcContracts,
  saveInitialBalanceDocumentContract,
} from '../../../../preload/contracts/portfolio/portfolio';
import { AssetType } from '../../../../shared/types/domain';
import type { IpcMainHandleRegistry } from '../../../../preload/main/registry/ipc-registrar';
import { PortfolioIpcRegistrar } from './portfolio-ipc-registrar';

type IpcHandler = (_event: Electron.IpcMainInvokeEvent, input?: unknown) => Promise<unknown>;

describe('PortfolioIpcRegistrar', () => {
  const saveInitialBalanceDocumentUseCase = mock<SaveInitialBalanceDocumentUseCase>();
  const listInitialBalanceDocumentsUseCase = mock<ListInitialBalanceDocumentsUseCase>();
  const deleteInitialBalanceDocumentUseCase = mock<DeleteInitialBalanceDocumentUseCase>();
  const listPositionsUseCase = mock<ListPositionsUseCase>();
  const recalculatePositionUseCase = mock<RecalculatePositionUseCase>();
  const migrateYearUseCase = mock<MigrateYearUseCase>();
  const importConsolidatedPositionUseCase = mock<ImportConsolidatedPositionUseCase>();
  const deletePositionUseCase = mock<DeletePositionUseCase>();
  const ipcEvent = {} as Electron.IpcMainInvokeEvent;

  beforeEach(() => {
    mockReset(saveInitialBalanceDocumentUseCase);
    mockReset(listInitialBalanceDocumentsUseCase);
    mockReset(deleteInitialBalanceDocumentUseCase);
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
      saveInitialBalanceDocumentUseCase,
      listInitialBalanceDocumentsUseCase,
      deleteInitialBalanceDocumentUseCase,
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
    saveInitialBalanceDocumentUseCase.execute.mockRejectedValue(
      new AppError('INITIAL_BALANCE_CONFLICT', 'Saldo inicial duplicado.', 'conflict', {
        ticker: 'PETR4',
      }),
    );
    const handlers = registerRegistrar();
    const saveInitialBalanceDocumentHandler = handlers.get(
      saveInitialBalanceDocumentContract.channel,
    );

    await expect(
      saveInitialBalanceDocumentHandler?.(ipcEvent, {
        ticker: 'PETR4',
        year: 2025,
        assetType: AssetType.Stock,
        averagePrice: '30',
        allocations: [{ brokerId: 'broker-xp', quantity: '10' }],
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
