import { contextBridge } from 'electron';
import type { ElectronApi } from '@shared/types/electron-api';

export const electronApi: ElectronApi = {
  appName: 'tax-report',
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
