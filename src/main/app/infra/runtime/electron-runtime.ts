import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import type { IpcMainHandleRegistry } from '../../../../ipc/main/binding/ipc-main-handle-registry';
import type { Runtime } from './runtime';

declare const MAIN_WINDOW_VITE_NAME: string | undefined;
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;

export interface ElectronRuntimeProps {
  appName?: string;
  platform?: NodeJS.Platform;
  devServerUrl?: string;
  currentDirectory?: string;
}

export class ElectronRuntime implements Runtime {
  private app: Electron.App;
  private ipcMain: Electron.IpcMain;
  private openedWindows: unknown[] = [];
  private platform: NodeJS.Platform;
  private currentDirectory: string;
  private appName?: string;
  private devServerUrl?: string;

  constructor(params: ElectronRuntimeProps = {}) {
    this.app = app;
    this.openedWindows = [];
    this.setAppName(params.appName);
    this.setDevServerUrl(params.devServerUrl);
    this.platform = params.platform ?? process.platform;
    this.currentDirectory = params.currentDirectory ?? __dirname;
    this.ipcMain = ipcMain;
    this.validate();
  }

  getApp(): Electron.App {
    return this.app;
  }

  getIpcMain(): IpcMainHandleRegistry {
    return this.ipcMain;
  }

  getUserDataPath(): string {
    return this.app.getPath('userData');
  }

  async start(): Promise<void> {
    await this.app.whenReady();
    this.createMainWindow();

    this.app.on('activate', () => {
      this.createWindowWhenNoneOpen();
    });

    this.app.on('window-all-closed', () => {
      this.quitUnlessMac();
    });
  }

  quit(): void {
    this.app.quit();
  }

  private hasWindowOpened(): boolean {
    return this.openedWindows.length > 0;
  }

  private createWindowWhenNoneOpen(): void {
    if (this.hasWindowOpened()) {
      return;
    }
    this.createMainWindow();
  }

  private createMainWindow(): void {
    const mainWindow = new BrowserWindow({
      height: 800,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(this.currentDirectory, './preload.js'),
        sandbox: true,
        webSecurity: true,
      },
      width: 1200,
    });
    this.openedWindows.push(mainWindow);
    this.render(mainWindow);
  }

  private render(browserWindow: BrowserWindow) {
    if (this.devServerUrl) {
      void browserWindow.loadURL(this.devServerUrl);
      return;
    }
    void browserWindow.loadFile(
      path.join(this.currentDirectory, `../renderer/${this.appName}/index.html`),
    );
  }

  private quitUnlessMac(): void {
    if (this.platform === 'darwin') {
      return;
    }
    this.app.quit();
  }

  private setAppName(appName?: string) {
    const viteAppName =
      typeof MAIN_WINDOW_VITE_NAME === 'undefined' ? undefined : MAIN_WINDOW_VITE_NAME;

    this.appName = appName ?? viteAppName ?? process.env.MAIN_WINDOW_VITE_NAME;
  }

  private setDevServerUrl(devServerUrl?: string) {
    const viteDevServerUrl =
      typeof MAIN_WINDOW_VITE_DEV_SERVER_URL === 'undefined'
        ? undefined
        : MAIN_WINDOW_VITE_DEV_SERVER_URL;

    this.devServerUrl =
      devServerUrl ?? viteDevServerUrl ?? process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
  }

  private validate() {
    if (!this.appName && !this.devServerUrl) {
      throw new Error(
        'Renderer target is not defined. Set MAIN_WINDOW_VITE_DEV_SERVER_URL or MAIN_WINDOW_VITE_NAME.',
      );
    }
  }
}
