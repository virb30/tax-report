import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronApi } from './renderer/electron-api';
import { buildElectronApi } from './renderer/build-electron-api';
import { rendererExposedIpcContracts } from './ipc/ipc-contract-registry';

export const electronApi = buildElectronApi(
  ipcRenderer,
  rendererExposedIpcContracts,
) as ElectronApi;

contextBridge.exposeInMainWorld('electronApi', electronApi);
