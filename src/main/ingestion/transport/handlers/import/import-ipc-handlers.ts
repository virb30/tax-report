import { dialog } from 'electron';
import type { ImportTransactionsUseCase } from '../../../application/use-cases/import-transactions/import-transactions-use-case';
import type { PreviewImportUseCase } from '../../../application/use-cases/preview-import/preview-import-use-case';
import type { DeleteDailyBrokerTaxUseCase } from '../../../application/use-cases/delete-daily-broker-tax/delete-daily-broker-tax.use-case';
import type { ImportDailyBrokerTaxesUseCase } from '../../../application/use-cases/import-daily-broker-taxes/import-daily-broker-taxes.use-case';
import type { ListDailyBrokerTaxesUseCase } from '../../../application/use-cases/list-daily-broker-taxes/list-daily-broker-taxes.use-case';
import type { SaveDailyBrokerTaxUseCase } from '../../../application/use-cases/save-daily-broker-tax/save-daily-broker-tax.use-case';
import type { IpcContractHandler } from '../../../../../preload/main/binding/bind-ipc-contract';
import type {
  confirmImportTransactionsContract,
  deleteDailyBrokerTaxContract,
  importDailyBrokerTaxesContract,
  importSelectFileContract,
  listDailyBrokerTaxesContract,
  previewImportTransactionsContract,
  saveDailyBrokerTaxContract,
} from '../../../../../preload/contracts/ingestion/import';

export type ImportIpcHandlers = {
  selectFile: IpcContractHandler<typeof importSelectFileContract>;
  previewTransactions: IpcContractHandler<typeof previewImportTransactionsContract>;
  confirmTransactions: IpcContractHandler<typeof confirmImportTransactionsContract>;
  listDailyBrokerTaxes: IpcContractHandler<typeof listDailyBrokerTaxesContract>;
  saveDailyBrokerTax: IpcContractHandler<typeof saveDailyBrokerTaxContract>;
  importDailyBrokerTaxes: IpcContractHandler<typeof importDailyBrokerTaxesContract>;
  deleteDailyBrokerTax: IpcContractHandler<typeof deleteDailyBrokerTaxContract>;
};

export function createImportIpcHandlers(
  previewImportUseCase: PreviewImportUseCase,
  importTransactionsUseCase: ImportTransactionsUseCase,
  listDailyBrokerTaxesUseCase: ListDailyBrokerTaxesUseCase,
  saveDailyBrokerTaxUseCase: SaveDailyBrokerTaxUseCase,
  importDailyBrokerTaxesUseCase: ImportDailyBrokerTaxesUseCase,
  deleteDailyBrokerTaxUseCase: DeleteDailyBrokerTaxUseCase,
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
    listDailyBrokerTaxes: () => listDailyBrokerTaxesUseCase.execute(),
    saveDailyBrokerTax: (payload) => saveDailyBrokerTaxUseCase.execute(payload),
    importDailyBrokerTaxes: (payload) => importDailyBrokerTaxesUseCase.execute(payload),
    deleteDailyBrokerTax: (payload) => deleteDailyBrokerTaxUseCase.execute(payload),
  };
}
