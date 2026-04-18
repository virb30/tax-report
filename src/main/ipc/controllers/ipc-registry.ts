import { IpcMain } from 'electron';
import { IpcController } from './ipc-controller.interface';

export class IpcRegistry {
  constructor(private readonly ipcControllers: IpcController[]) {}

  registerAll(ipcMain: IpcMain): void {
    for (const controller of this.ipcControllers) {
      controller.register(ipcMain);
    }
  }
}
