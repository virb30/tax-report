import { z } from 'zod';
import { dialog } from 'electron';
import { IpcController } from './ipc-controller.interface';
import { PreviewImportUseCase } from '../../application/use-cases/preview-import/preview-import-use-case';
import { ImportTransactionsUseCase } from '../../application/use-cases/import-transactions/import-transactions-use-case';

function parseWith<T>(schema: z.ZodType<T>, input: unknown, payloadErrorMessage: string): T {
  if (!input || typeof input !== 'object') {
    throw new Error(payloadErrorMessage);
  }
  try {
    return schema.parse(input);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const message = err.issues?.[0]?.message || err.message;
      throw new Error(message);
    }
    throw err;
  }
}

const previewImportTransactionsSchema = z.object({
  filePath: z.string({ message: 'Invalid file path for preview import transactions.' }).trim().min(1, 'Invalid file path for preview import transactions.'),
});

const confirmImportTransactionsSchema = z.object({
  filePath: z.string({ message: 'Invalid file path for confirm import transactions.' }).trim().min(1, 'Invalid file path for confirm import transactions.'),
});

export class ImportController implements IpcController {
  constructor(
    private readonly previewImportUseCase: PreviewImportUseCase,
    private readonly importTransactionsUseCase: ImportTransactionsUseCase,
  ) {}

  register(ipcMain: Electron.IpcMain): string[] {
    const channels = [
      'import:select-file',
      'import:preview-transactions',
      'import:confirm-transactions',
    ];

    ipcMain.handle('import:select-file', async () => {
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

    ipcMain.handle('import:preview-transactions', async (_event, input: unknown) => {
      const payload = parseWith(previewImportTransactionsSchema, input, 'Invalid payload for preview import transactions.');
      return this.previewImportUseCase.execute(payload);
    });

    ipcMain.handle('import:confirm-transactions', async (_event, input: unknown) => {
      const payload = parseWith(confirmImportTransactionsSchema, input, 'Invalid payload for confirm import transactions.');
      const result = await this.importTransactionsUseCase.execute(payload);
      return {
        importedCount: result.importedCount,
        recalculatedTickers: result.recalculatedTickers,
      };
    });

    return channels;
  }
}
