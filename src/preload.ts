import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronApi } from './shared/types/electron-api';
import type { GenerateAssetsReportQuery } from './shared/contracts/assets-report.contract';
import type {
  CreateBrokerCommand,
  ListBrokersQuery,
  UpdateBrokerCommand,
  ToggleBrokerActiveCommand,
} from './shared/contracts/brokers.contract';
import type { RecalculatePositionCommand } from './shared/contracts/recalculate.contract';
import type { MigrateYearCommand } from './shared/contracts/migrate-year.contract';
import type {
  ImportConsolidatedPositionCommand,
  PreviewConsolidatedPositionCommand,
} from './shared/contracts/import-consolidated-position.contract';
import type { DeletePositionCommand } from './shared/contracts/delete-position.contract';
import type { SetInitialBalanceCommand } from './shared/contracts/initial-balance.contract';
import type { ListPositionsQuery } from './shared/contracts/list-positions.contract';
import type {
  ConfirmImportTransactionsCommand,
  PreviewImportTransactionsCommand,
} from './shared/contracts/preview-import.contract';
import { ELECTRON_API_CHANNELS } from './shared/ipc/ipc-channels';

export const electronApi: ElectronApi = {
  appName: 'tax-report',
  importSelectFile: () => ipcRenderer.invoke(ELECTRON_API_CHANNELS.importSelectFile),
  previewImportTransactions: (input: PreviewImportTransactionsCommand) =>
    ipcRenderer.invoke(ELECTRON_API_CHANNELS.previewImportTransactions, input),
  confirmImportTransactions: (input: ConfirmImportTransactionsCommand) =>
    ipcRenderer.invoke(ELECTRON_API_CHANNELS.confirmImportTransactions, input),
  setInitialBalance: (input: SetInitialBalanceCommand) =>
    ipcRenderer.invoke(ELECTRON_API_CHANNELS.setInitialBalance, input),
  listPositions: (input: ListPositionsQuery) =>
    ipcRenderer.invoke(ELECTRON_API_CHANNELS.listPositions, input),
  generateAssetsReport: (input: GenerateAssetsReportQuery) =>
    ipcRenderer.invoke(ELECTRON_API_CHANNELS.generateAssetsReport, input),
  listBrokers: (input?: ListBrokersQuery) =>
    ipcRenderer.invoke(ELECTRON_API_CHANNELS.listBrokers, input),
  createBroker: (input: CreateBrokerCommand) =>
    ipcRenderer.invoke(ELECTRON_API_CHANNELS.createBroker, input),
  updateBroker: (input: UpdateBrokerCommand) =>
    ipcRenderer.invoke(ELECTRON_API_CHANNELS.updateBroker, input),
  toggleBrokerActive: (input: ToggleBrokerActiveCommand) =>
    ipcRenderer.invoke(ELECTRON_API_CHANNELS.toggleBrokerActive, input),
  recalculatePosition: (input: RecalculatePositionCommand) =>
    ipcRenderer.invoke(ELECTRON_API_CHANNELS.recalculatePosition, input),
  migrateYear: (input: MigrateYearCommand) =>
    ipcRenderer.invoke(ELECTRON_API_CHANNELS.migrateYear, input),
  previewConsolidatedPosition: (input: PreviewConsolidatedPositionCommand) =>
    ipcRenderer.invoke(ELECTRON_API_CHANNELS.previewConsolidatedPosition, input),
  importConsolidatedPosition: (input: ImportConsolidatedPositionCommand) =>
    ipcRenderer.invoke(ELECTRON_API_CHANNELS.importConsolidatedPosition, input),
  deletePosition: (input: DeletePositionCommand) =>
    ipcRenderer.invoke(ELECTRON_API_CHANNELS.deletePosition, input),
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
