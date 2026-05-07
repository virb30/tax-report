import type { IpcMainHandleRegistry } from '../../../../ipc/main/binding/ipc-main-handle-registry';

export interface Runtime {
  getUserDataPath(): string;
  getIpcMain(): IpcMainHandleRegistry;
  start(): Promise<void>;
  quit(): void;
}
