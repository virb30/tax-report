import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mock, mockReset } from 'jest-mock-extended';
import type { ImportTransactionsUseCase } from '../../application/use-cases/import-transactions/import-transactions-use-case';
import type { PreviewImportUseCase } from '../../application/use-cases/preview-import/preview-import-use-case';
import { IMPORT_IPC_CHANNELS } from '../../../shared/ipc/ipc-channels';
import type { IpcMainHandleRegistry } from './ipc-controller.interface';

const showOpenDialog = jest
  .fn<(options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>>();

jest.mock('electron', () => ({
  dialog: {
    showOpenDialog,
  },
}));

import { ImportController } from './import.controller';

type IpcHandler = (_event: Electron.IpcMainInvokeEvent, input?: unknown) => Promise<unknown>;

describe('ImportController', () => {
  const previewImportUseCase = mock<PreviewImportUseCase>();
  const importTransactionsUseCase = mock<ImportTransactionsUseCase>();
  const ipcEvent = {} as Electron.IpcMainInvokeEvent;

  beforeEach(() => {
    mockReset(previewImportUseCase);
    mockReset(importTransactionsUseCase);
    showOpenDialog.mockReset();
  });

  function registerController(): Map<string, IpcHandler> {
    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel, listener) => {
        handlers.set(channel, listener as IpcHandler);
      },
    };

    const controller = new ImportController(previewImportUseCase, importTransactionsUseCase);

    expect(controller.register(ipcMain)).toEqual(Object.values(IMPORT_IPC_CHANNELS));

    return handlers;
  }

  it('returns null when the file picker is canceled', async () => {
    showOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: [],
    } as Electron.OpenDialogReturnValue);
    const handlers = registerController();
    const selectFileHandler = handlers.get(IMPORT_IPC_CHANNELS.selectFile);

    await expect(selectFileHandler?.(ipcEvent)).resolves.toEqual({ filePath: null });
  });

  it('returns the first selected file path', async () => {
    showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['C:/imports/operations.csv', 'C:/imports/ignored.csv'],
    } as Electron.OpenDialogReturnValue);
    const handlers = registerController();
    const selectFileHandler = handlers.get(IMPORT_IPC_CHANNELS.selectFile);

    await expect(selectFileHandler?.(ipcEvent)).resolves.toEqual({
      filePath: 'C:/imports/operations.csv',
    });
  });

  it('falls back to null when the dialog returns no selected paths', async () => {
    showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [],
    } as Electron.OpenDialogReturnValue);
    const handlers = registerController();
    const selectFileHandler = handlers.get(IMPORT_IPC_CHANNELS.selectFile);

    await expect(selectFileHandler?.(ipcEvent)).resolves.toEqual({ filePath: null });
  });

  it('delegates preview execution with validated payloads', async () => {
    previewImportUseCase.execute.mockResolvedValue({
      batches: [],
      transactionsPreview: [],
      warnings: undefined,
    });
    const handlers = registerController();
    const previewHandler = handlers.get(IMPORT_IPC_CHANNELS.previewTransactions);

    await expect(
      previewHandler?.(ipcEvent, {
        filePath: 'C:/imports/operations.csv',
      }),
    ).resolves.toEqual({
      batches: [],
      transactionsPreview: [],
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
    });
    const handlers = registerController();
    const confirmHandler = handlers.get(IMPORT_IPC_CHANNELS.confirmTransactions);

    await expect(
      confirmHandler?.(ipcEvent, {
        filePath: 'C:/imports/operations.csv',
      }),
    ).resolves.toEqual({
      importedCount: 2,
      recalculatedTickers: ['PETR4', 'VALE3'],
    });
  });
});
