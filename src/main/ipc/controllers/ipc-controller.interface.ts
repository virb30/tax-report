export type IpcMainHandleRegistry = Pick<Electron.IpcMain, 'handle'>;

export interface IpcController {
  register(ipcMain: IpcMainHandleRegistry): string[];
}
