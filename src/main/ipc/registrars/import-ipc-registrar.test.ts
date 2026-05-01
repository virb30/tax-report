import { jest } from '@jest/globals';
import { mock, mockReset } from 'jest-mock-extended';
import type { ImportTransactionsUseCase } from '../../application/use-cases/import-transactions/import-transactions-use-case';
import type { PreviewImportUseCase } from '../../application/use-cases/preview-import/preview-import-use-case';
import {
  confirmImportTransactionsContract,
  importIpcContracts,
  importSelectFileContract,
  previewImportTransactionsContract,
} from '../../../shared/ipc/contracts/import';
import type { IpcMainHandleRegistry } from '../registry/ipc-registrar';

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
  const ipcEvent = {} as Electron.IpcMainInvokeEvent;

  beforeEach(() => {
    mockReset(previewImportUseCase);
    mockReset(importTransactionsUseCase);
    showOpenDialog.mockReset();
  });

  function registerRegistrar(): Map<string, IpcHandler> {
    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel, listener) => {
        handlers.set(channel, listener as IpcHandler);
      },
    };

    const registrar = new ImportIpcRegistrar(previewImportUseCase, importTransactionsUseCase);

    expect(registrar.register(ipcMain)).toEqual(
      importIpcContracts.map((contract) => contract.channel),
    );

    return handlers;
  }

  it('returns null when the file picker is canceled', async () => {
    showOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: [],
    } as Electron.OpenDialogReturnValue);
    const handlers = registerRegistrar();
    const selectFileHandler = handlers.get(importSelectFileContract.channel);

    await expect(selectFileHandler?.(ipcEvent)).resolves.toEqual({ filePath: null });
  });

  it('returns the first selected file path', async () => {
    showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['C:/imports/operations.csv', 'C:/imports/ignored.csv'],
    } as Electron.OpenDialogReturnValue);
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
    } as Electron.OpenDialogReturnValue);
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
});
