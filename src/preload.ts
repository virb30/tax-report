import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronApi } from '@shared/types/electron-api';
import type { GenerateAssetsReportQuery } from '@shared/contracts/assets-report.contract';
import type { CreateBrokerCommand } from '@shared/contracts/brokers.contract';
import type { ImportOperationsCommand } from '@shared/contracts/import-operations.contract';
import type { SetInitialBalanceCommand } from '@shared/contracts/initial-balance.contract';
import type {
  ConfirmImportOperationsCommand,
  PreviewImportFromFileCommand,
} from '@shared/contracts/preview-import.contract';

export const electronApi: ElectronApi = {
  appName: 'tax-report',
  previewImportFromFile: (input: PreviewImportFromFileCommand) =>
    ipcRenderer.invoke('import:preview-file', input),
  importOperations: (input: ImportOperationsCommand) => ipcRenderer.invoke('import:operations', input),
  confirmImportOperations: (input: ConfirmImportOperationsCommand) =>
    ipcRenderer.invoke('import:confirm-operations', input),
  setInitialBalance: (input: SetInitialBalanceCommand) =>
    ipcRenderer.invoke('portfolio:set-initial-balance', input),
  listPositions: () => ipcRenderer.invoke('portfolio:list-positions'),
  generateAssetsReport: (input: GenerateAssetsReportQuery) =>
    ipcRenderer.invoke('report:assets-annual', input),
  listBrokers: () => ipcRenderer.invoke('brokers:list'),
  createBroker: (input: CreateBrokerCommand) =>
    ipcRenderer.invoke('brokers:create', input),
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
