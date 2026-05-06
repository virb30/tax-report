import { jest } from '@jest/globals';
import { mock, mockReset } from 'jest-mock-extended';
import type { ImportTransactionsUseCase } from '../../application/use-cases/import-transactions.use-case';
import type { PreviewImportUseCase } from '../../application/use-cases/preview-import.use-case';
import type { DeleteDailyBrokerTaxUseCase } from '../../application/use-cases/delete-daily-broker-tax.use-case';
import type { ImportDailyBrokerTaxesUseCase } from '../../application/use-cases/import-daily-broker-taxes.use-case';
import type { ListDailyBrokerTaxesUseCase } from '../../application/use-cases/list-daily-broker-taxes.use-case';
import type { SaveDailyBrokerTaxUseCase } from '../../application/use-cases/save-daily-broker-tax.use-case';
import {
  confirmImportTransactionsContract,
  deleteDailyBrokerTaxContract,
  importDailyBrokerTaxesContract,
  importIpcContracts,
  importSelectFileContract,
  listDailyBrokerTaxesContract,
  previewImportTransactionsContract,
  saveDailyBrokerTaxContract,
} from '../../../../ipc/contracts/ingestion/import';
import type { IpcMainHandleRegistry } from '../../../../ipc/main/registry/ipc-registrar';

const showOpenDialog =
  jest.fn<(options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>>();

jest.mock('electron', () => ({
  dialog: {
    showOpenDialog,
  },
}));

import { ImportIpcRegistrar } from './import-ipc-registrar';

type IpcHandler = (_event: Electron.IpcMainInvokeEvent, input?: unknown) => Promise<unknown>;

describe('ImportIpcRegistrar', () => {
  const previewImportUseCase = mock<PreviewImportUseCase>();
  const importTransactionsUseCase = mock<ImportTransactionsUseCase>();
  const listDailyBrokerTaxesUseCase = mock<ListDailyBrokerTaxesUseCase>();
  const saveDailyBrokerTaxUseCase = mock<SaveDailyBrokerTaxUseCase>();
  const importDailyBrokerTaxesUseCase = mock<ImportDailyBrokerTaxesUseCase>();
  const deleteDailyBrokerTaxUseCase = mock<DeleteDailyBrokerTaxUseCase>();
  const ipcEvent = {} as Electron.IpcMainInvokeEvent;

  beforeEach(() => {
    mockReset(previewImportUseCase);
    mockReset(importTransactionsUseCase);
    mockReset(listDailyBrokerTaxesUseCase);
    mockReset(saveDailyBrokerTaxUseCase);
    mockReset(importDailyBrokerTaxesUseCase);
    mockReset(deleteDailyBrokerTaxUseCase);
    showOpenDialog.mockReset();
  });

  function registerRegistrar(): Map<string, IpcHandler> {
    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel, listener) => {
        handlers.set(channel, listener as IpcHandler);
      },
    };

    const registrar = new ImportIpcRegistrar(
      previewImportUseCase,
      importTransactionsUseCase,
      listDailyBrokerTaxesUseCase,
      saveDailyBrokerTaxUseCase,
      importDailyBrokerTaxesUseCase,
      deleteDailyBrokerTaxUseCase,
    );

    expect(registrar.register(ipcMain)).toEqual(
      importIpcContracts.map((contract) => contract.channel),
    );

    return handlers;
  }

  it('returns null when the file picker is canceled', async () => {
    showOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: [],
    });
    const handlers = registerRegistrar();
    const selectFileHandler = handlers.get(importSelectFileContract.channel);

    await expect(selectFileHandler?.(ipcEvent)).resolves.toEqual({ filePath: null });
  });

  it('returns the first selected file path', async () => {
    showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['C:/imports/operations.csv', 'C:/imports/ignored.csv'],
    });
    const handlers = registerRegistrar();
    const selectFileHandler = handlers.get(importSelectFileContract.channel);

    await expect(selectFileHandler?.(ipcEvent)).resolves.toEqual({
      filePath: 'C:/imports/operations.csv',
    });
  });

  it('falls back to null when the dialog returns no selected paths', async () => {
    showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [],
    });
    const handlers = registerRegistrar();
    const selectFileHandler = handlers.get(importSelectFileContract.channel);

    await expect(selectFileHandler?.(ipcEvent)).resolves.toEqual({ filePath: null });
  });

  it('delegates preview execution with validated payloads', async () => {
    previewImportUseCase.execute.mockResolvedValue({
      batches: [],
      transactionsPreview: [],
      summary: {
        supportedRows: 0,
        pendingRows: 0,
        unsupportedRows: 0,
      },
      warnings: undefined,
    });
    const handlers = registerRegistrar();
    const previewHandler = handlers.get(previewImportTransactionsContract.channel);

    await expect(
      previewHandler?.(ipcEvent, {
        filePath: 'C:/imports/operations.csv',
      }),
    ).resolves.toEqual({
      batches: [],
      transactionsPreview: [],
      summary: {
        supportedRows: 0,
        pendingRows: 0,
        unsupportedRows: 0,
      },
      warnings: undefined,
    });

    expect(previewImportUseCase.execute).toHaveBeenCalledWith({
      filePath: 'C:/imports/operations.csv',
    });
  });

  it('maps confirmed imports to the public IPC result shape', async () => {
    importTransactionsUseCase.execute.mockResolvedValue({
      importedCount: 2,
      recalculatedTickers: ['PETR4', 'VALE3'],
      skippedUnsupportedRows: 1,
    });
    const handlers = registerRegistrar();
    const confirmHandler = handlers.get(confirmImportTransactionsContract.channel);

    await expect(
      confirmHandler?.(ipcEvent, {
        filePath: 'C:/imports/operations.csv',
        assetTypeOverrides: [],
      }),
    ).resolves.toEqual({
      importedCount: 2,
      recalculatedTickers: ['PETR4', 'VALE3'],
      skippedUnsupportedRows: 1,
    });
  });

  it('delegates daily broker tax handlers', async () => {
    listDailyBrokerTaxesUseCase.execute.mockResolvedValue({ items: [] });
    saveDailyBrokerTaxUseCase.execute.mockResolvedValue({
      tax: {
        date: '2025-04-01',
        brokerId: 'broker-id',
        brokerCode: 'XP',
        brokerName: 'XP',
        fees: 1,
        irrf: 0.01,
      },
      recalculatedTickers: [],
    });
    importDailyBrokerTaxesUseCase.execute.mockResolvedValue({
      importedCount: 1,
      recalculatedTickers: ['PETR4'],
    });
    deleteDailyBrokerTaxUseCase.execute.mockResolvedValue({
      deleted: true,
      recalculatedTickers: ['PETR4'],
    });
    const handlers = registerRegistrar();

    await expect(handlers.get(listDailyBrokerTaxesContract.channel)?.(ipcEvent)).resolves.toEqual({
      items: [],
    });
    await expect(
      handlers.get(saveDailyBrokerTaxContract.channel)?.(ipcEvent, {
        date: '2025-04-01',
        brokerId: 'broker-id',
        fees: 1,
        irrf: 0.01,
      }),
    ).resolves.toEqual({
      tax: expect.objectContaining({ brokerCode: 'XP' }),
      recalculatedTickers: [],
    });
    await expect(
      handlers.get(importDailyBrokerTaxesContract.channel)?.(ipcEvent, {
        filePath: 'C:/imports/taxes.csv',
      }),
    ).resolves.toEqual({
      importedCount: 1,
      recalculatedTickers: ['PETR4'],
    });
    await expect(
      handlers.get(deleteDailyBrokerTaxContract.channel)?.(ipcEvent, {
        date: '2025-04-01',
        brokerId: 'broker-id',
      }),
    ).resolves.toEqual({
      deleted: true,
      recalculatedTickers: ['PETR4'],
    });
  });
});
