export interface IpcController {
  register(ipcMain: Electron.IpcMain): string[];
}