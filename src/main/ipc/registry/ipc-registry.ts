import type { IpcMainHandleRegistry, IpcRegistrar } from './ipc-registrar';

export class IpcRegistry {
  constructor(private readonly ipcRegistrars: IpcRegistrar[]) {}

  registerAll(ipcMain: IpcMainHandleRegistry): void {
    for (const registrar of this.ipcRegistrars) {
      registrar.register(ipcMain);
    }
  }
}
