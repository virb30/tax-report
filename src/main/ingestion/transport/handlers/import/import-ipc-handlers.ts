import { dialog } from 'electron';
import type { ImportTransactionsUseCase } from '../../../application/use-cases/import-transactions/import-transactions-use-case';
import type { PreviewImportUseCase } from '../../../application/use-cases/preview-import/preview-import-use-case';
import type { IpcContractHandler } from '../../../../../preload/main/binding/bind-ipc-contract';
import type {
  confirmImportTransactionsContract,
  importSelectFileContract,
  previewImportTransactionsContract,
} from '../../../../../preload/contracts/ingestion/import';

export type ImportIpcHandlers = {
  selectFile: IpcContractHandler<typeof importSelectFileContract>;
  previewTransactions: IpcContractHandler<typeof previewImportTransactionsContract>;
  confirmTransactions: IpcContractHandler<typeof confirmImportTransactionsContract>;
};

export function createImportIpcHandlers(
  previewImportUseCase: PreviewImportUseCase,
  importTransactionsUseCase: ImportTransactionsUseCase,
): ImportIpcHandlers {
  return {
    selectFile: async () => {
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
    },
    previewTransactions: (payload) => previewImportUseCase.execute(payload),
    confirmTransactions: async (payload) => {
      const result = await importTransactionsUseCase.execute(payload);

      return {
        importedCount: result.importedCount,
        recalculatedTickers: result.recalculatedTickers,
        skippedUnsupportedRows: result.skippedUnsupportedRows,
      };
    },
  };
}
