import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronApi } from './shared/types/electron-api';
import { buildElectronApi } from './preload-bridge/build-electron-api';
import { rendererExposedIpcContracts } from './shared/ipc/contracts/ipc-contract-registry';

export const electronApi = buildElectronApi(
  ipcRenderer,
  rendererExposedIpcContracts,
) as ElectronApi;

contextBridge.exposeInMainWorld('electronApi', electronApi);
