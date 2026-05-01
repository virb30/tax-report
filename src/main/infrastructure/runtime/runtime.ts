import type { IpcRegistry } from '../../ipc/registry/ipc-registry';

export interface Runtime {
  getUserDataPath(): string;
  registerIpcHandlers(registry: IpcRegistry): void;
  start(): Promise<void>;
  quit(): void;
}
