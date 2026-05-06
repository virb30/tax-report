/// <reference types="vite/client" />

import type { ElectronApi } from '../ipc/public';

declare global {
  interface Window {
    electronApi: ElectronApi;
  }
}
