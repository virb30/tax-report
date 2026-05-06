import { contextBridge, ipcRenderer } from 'electron';
import { buildElectronApi, type ElectronApi, rendererExposedIpcContracts } from '../ipc/public';

export const electronApi = buildElectronApi(
  ipcRenderer,
  rendererExposedIpcContracts,
) as ElectronApi;

contextBridge.exposeInMainWorld('electronApi', electronApi);
