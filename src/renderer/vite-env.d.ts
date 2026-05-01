/// <reference types="vite/client" />

import type { ElectronApi } from '../preload/renderer/electron-api';

declare global {
  interface Window {
    electronApi: ElectronApi;
  }
}
