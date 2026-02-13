import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronApi } from '@shared/types/electron-api';
import type { GenerateAssetsReportQuery } from '@shared/contracts/assets-report.contract';
import type { ImportOperationsCommand } from '@shared/contracts/import-operations.contract';
import type { SetManualBaseCommand } from '@shared/contracts/manual-base.contract';
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
  setManualBase: (input: SetManualBaseCommand) =>
    ipcRenderer.invoke('portfolio:set-manual-base', input),
  listPositions: () => ipcRenderer.invoke('portfolio:list-positions'),
  generateAssetsReport: (input: GenerateAssetsReportQuery) =>
    ipcRenderer.invoke('report:assets-annual', input),
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
