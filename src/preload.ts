import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronApi } from '@shared/types/electron-api';
import type { GenerateAssetsReportQuery } from '@shared/contracts/assets-report.contract';
import type {
  CreateBrokerCommand,
  ListBrokersQuery,
  UpdateBrokerCommand,
  ToggleBrokerActiveCommand,
} from '@shared/contracts/brokers.contract';
import type { RecalculatePositionCommand } from '@shared/contracts/recalculate.contract';
import type { MigrateYearCommand } from '@shared/contracts/migrate-year.contract';
import type {
  ImportConsolidatedPositionCommand,
  PreviewConsolidatedPositionCommand,
} from '@shared/contracts/import-consolidated-position.contract';
import type { DeletePositionCommand } from '@shared/contracts/delete-position.contract';
import type { SetInitialBalanceCommand } from '@shared/contracts/initial-balance.contract';
import type { ListPositionsQuery } from '@shared/contracts/list-positions.contract';
import type {
  ConfirmImportTransactionsCommand,
  PreviewImportTransactionsCommand,
} from '@shared/contracts/preview-import.contract';

export const electronApi: ElectronApi = {
  appName: 'tax-report',
  importSelectFile: () => ipcRenderer.invoke('import:select-file'),
  previewImportTransactions: (input: PreviewImportTransactionsCommand) =>
    ipcRenderer.invoke('import:preview-transactions', input),
  confirmImportTransactions: (input: ConfirmImportTransactionsCommand) =>
    ipcRenderer.invoke('import:confirm-transactions', input),
  setInitialBalance: (input: SetInitialBalanceCommand) =>
    ipcRenderer.invoke('portfolio:set-initial-balance', input),
  listPositions: (input: ListPositionsQuery) =>
    ipcRenderer.invoke('portfolio:list-positions', input),
  generateAssetsReport: (input: GenerateAssetsReportQuery) =>
    ipcRenderer.invoke('report:assets-annual', input),
  listBrokers: (input?: ListBrokersQuery) =>
    ipcRenderer.invoke('brokers:list', input),
  createBroker: (input: CreateBrokerCommand) =>
    ipcRenderer.invoke('brokers:create', input),
  updateBroker: (input: UpdateBrokerCommand) =>
    ipcRenderer.invoke('brokers:update', input),
  toggleBrokerActive: (input: ToggleBrokerActiveCommand) =>
    ipcRenderer.invoke('brokers:toggle-active', input),
  recalculatePosition: (input: RecalculatePositionCommand) =>
    ipcRenderer.invoke('portfolio:recalculate', input),
  migrateYear: (input: MigrateYearCommand) =>
    ipcRenderer.invoke('portfolio:migrate-year', input),
  previewConsolidatedPosition: (input: PreviewConsolidatedPositionCommand) =>
    ipcRenderer.invoke('portfolio:preview-consolidated-position', input),
  importConsolidatedPosition: (input: ImportConsolidatedPositionCommand) =>
    ipcRenderer.invoke('portfolio:import-consolidated-position', input),
  deletePosition: (input: DeletePositionCommand) =>
    ipcRenderer.invoke('portfolio:delete-position', input),
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
