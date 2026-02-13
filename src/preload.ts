import { contextBridge } from 'electron';

export type ElectronApi = {
  appName: string;
};

export const electronApi: ElectronApi = {
  appName: 'tax-report',
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
