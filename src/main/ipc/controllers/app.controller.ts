import type { IpcController, IpcMainHandleRegistry } from './ipc-controller.interface';
import { APP_IPC_CHANNELS } from '../../../shared/ipc/ipc-channels';

export class AppController implements IpcController {
  constructor() {}

  register(ipcMain: IpcMainHandleRegistry): string[] {
    const channels = Object.values(APP_IPC_CHANNELS);

    ipcMain.handle(APP_IPC_CHANNELS.healthCheck, () => {
      return { status: 'ok' };
    });

    return channels;
  }
}
