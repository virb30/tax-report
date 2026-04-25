import type { IpcMainHandleRegistry, IpcRegistrar } from '../registry/ipc-registrar';
import type { PreviewImportUseCase } from '../../application/use-cases/preview-import/preview-import-use-case';
import type { ImportTransactionsUseCase } from '../../application/use-cases/import-transactions/import-transactions-use-case';
import { bindIpcContract } from '../binding/bind-ipc-contract';
import { createImportIpcHandlers } from '../handlers/import/import-ipc-handlers';
import {
  confirmImportTransactionsContract,
  importIpcContracts,
  importSelectFileContract,
  previewImportTransactionsContract,
} from '../../../shared/ipc/contracts/import';

export class ImportIpcRegistrar implements IpcRegistrar {
  constructor(
    private readonly previewImportUseCase: PreviewImportUseCase,
    private readonly importTransactionsUseCase: ImportTransactionsUseCase,
  ) {}

  register(ipcMain: IpcMainHandleRegistry): string[] {
    const handlers = createImportIpcHandlers(
      this.previewImportUseCase,
      this.importTransactionsUseCase,
    );

    bindIpcContract(ipcMain, importSelectFileContract, handlers.selectFile);
    bindIpcContract(ipcMain, previewImportTransactionsContract, handlers.previewTransactions);
    bindIpcContract(ipcMain, confirmImportTransactionsContract, handlers.confirmTransactions);

    return importIpcContracts.map((contract) => contract.channel);
  }
}
