import { IpcController } from './ipc-controller.interface';

export class AppController implements IpcController {
  constructor() {}

  register(ipcMain: Electron.IpcMain): string[] {
    const channels = ['app:health-check'];

    ipcMain.handle('app:health-check', async () => {
      return { status: 'ok' };
    });

    return channels;
  }
}
