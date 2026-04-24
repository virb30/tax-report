import { z } from 'zod';
import { dialog } from 'electron';
import type { IpcController, IpcMainHandleRegistry } from './ipc-controller.interface';
import type { PreviewImportUseCase } from '../../application/use-cases/preview-import/preview-import-use-case';
import type { ImportTransactionsUseCase } from '../../application/use-cases/import-transactions/import-transactions-use-case';
import { registerValidatedHandler } from './ipc-handler.utils';
import { IMPORT_IPC_CHANNELS } from '../../../shared/ipc/ipc-channels';

const previewImportTransactionsSchema = z.object({
  filePath: z
    .string({ message: 'Invalid file path for preview import transactions.' })
    .trim()
    .min(1, 'Invalid file path for preview import transactions.'),
});

const confirmImportTransactionsSchema = z.object({
  filePath: z
    .string({ message: 'Invalid file path for confirm import transactions.' })
    .trim()
    .min(1, 'Invalid file path for confirm import transactions.'),
});

export class ImportController implements IpcController {
  constructor(
    private readonly previewImportUseCase: PreviewImportUseCase,
    private readonly importTransactionsUseCase: ImportTransactionsUseCase,
  ) {}

  register(ipcMain: IpcMainHandleRegistry): string[] {
    const channels = Object.values(IMPORT_IPC_CHANNELS);

    ipcMain.handle(IMPORT_IPC_CHANNELS.selectFile, async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Planilhas', extensions: ['csv', 'xlsx'] },
          { name: 'Todos os arquivos', extensions: ['*'] },
        ],
      });
      if (result.canceled) {
        return { filePath: null };
      }
      return { filePath: result.filePaths[0] ?? null };
    });

    registerValidatedHandler(ipcMain, {
      channel: IMPORT_IPC_CHANNELS.previewTransactions,
      schema: previewImportTransactionsSchema,
      payloadErrorMessage: 'Invalid payload for preview import transactions.',
      execute: (payload) => this.previewImportUseCase.execute(payload),
    });

    registerValidatedHandler(ipcMain, {
      channel: IMPORT_IPC_CHANNELS.confirmTransactions,
      schema: confirmImportTransactionsSchema,
      payloadErrorMessage: 'Invalid payload for confirm import transactions.',
      execute: async (payload) => {
        const result = await this.importTransactionsUseCase.execute(payload);
        return {
          importedCount: result.importedCount,
          recalculatedTickers: result.recalculatedTickers,
        };
      },
    });

    return channels;
  }
}
