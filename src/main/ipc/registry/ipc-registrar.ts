export type IpcMainHandleRegistry = Pick<Electron.IpcMain, 'handle'>;

export interface IpcRegistrar {
  register(ipcMain: IpcMainHandleRegistry): string[];
}
