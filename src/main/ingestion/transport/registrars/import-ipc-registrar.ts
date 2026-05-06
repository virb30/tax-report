import type {
  IpcMainHandleRegistry,
  IpcRegistrar,
} from '../../../../ipc/main/registry/ipc-registrar';
import type { PreviewImportUseCase } from '../../application/use-cases/preview-import.use-case';
import type { ImportTransactionsUseCase } from '../../application/use-cases/import-transactions.use-case';
import type { DeleteDailyBrokerTaxUseCase } from '../../application/use-cases/delete-daily-broker-tax.use-case';
import type { ImportDailyBrokerTaxesUseCase } from '../../application/use-cases/import-daily-broker-taxes.use-case';
import type { ListDailyBrokerTaxesUseCase } from '../../application/use-cases/list-daily-broker-taxes.use-case';
import type { SaveDailyBrokerTaxUseCase } from '../../application/use-cases/save-daily-broker-tax.use-case';
import { bindIpcContract } from '../../../../ipc/main/binding/bind-ipc-contract';
import { createImportIpcHandlers } from '../handlers/import/import-ipc-handlers';
import {
  confirmImportTransactionsContract,
  deleteDailyBrokerTaxContract,
  importDailyBrokerTaxesContract,
  importIpcContracts,
  importSelectFileContract,
  listDailyBrokerTaxesContract,
  previewImportTransactionsContract,
  saveDailyBrokerTaxContract,
} from '../../../../ipc/contracts/ingestion/import/contracts';

export class ImportIpcRegistrar implements IpcRegistrar {
  constructor(
    private readonly previewImportUseCase: PreviewImportUseCase,
    private readonly importTransactionsUseCase: ImportTransactionsUseCase,
    private readonly listDailyBrokerTaxesUseCase: ListDailyBrokerTaxesUseCase,
    private readonly saveDailyBrokerTaxUseCase: SaveDailyBrokerTaxUseCase,
    private readonly importDailyBrokerTaxesUseCase: ImportDailyBrokerTaxesUseCase,
    private readonly deleteDailyBrokerTaxUseCase: DeleteDailyBrokerTaxUseCase,
  ) {}

  register(ipcMain: IpcMainHandleRegistry): string[] {
    const handlers = createImportIpcHandlers(
      this.previewImportUseCase,
      this.importTransactionsUseCase,
      this.listDailyBrokerTaxesUseCase,
      this.saveDailyBrokerTaxUseCase,
      this.importDailyBrokerTaxesUseCase,
      this.deleteDailyBrokerTaxUseCase,
    );

    bindIpcContract(ipcMain, importSelectFileContract, handlers.selectFile);
    bindIpcContract(ipcMain, previewImportTransactionsContract, handlers.previewTransactions);
    bindIpcContract(ipcMain, confirmImportTransactionsContract, handlers.confirmTransactions);
    bindIpcContract(ipcMain, listDailyBrokerTaxesContract, handlers.listDailyBrokerTaxes);
    bindIpcContract(ipcMain, saveDailyBrokerTaxContract, handlers.saveDailyBrokerTax);
    bindIpcContract(ipcMain, importDailyBrokerTaxesContract, handlers.importDailyBrokerTaxes);
    bindIpcContract(ipcMain, deleteDailyBrokerTaxContract, handlers.deleteDailyBrokerTax);

    return importIpcContracts.map((contract) => contract.channel);
  }
}
