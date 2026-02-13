import { BrowserWindow } from 'electron';
import path from 'node:path';

type BrowserWindowInstance = {
  loadURL: (url: string) => Promise<void>;
  loadFile: (filePath: string) => Promise<void>;
};

type BrowserWindowConstructor = new (options: {
  width: number;
  height: number;
  webPreferences: { preload: string };
}) => BrowserWindowInstance;

export class WindowManager {
  constructor(
    private readonly browserWindowClass: BrowserWindowConstructor = BrowserWindow,
    private readonly currentDirectory: string = __dirname,
  ) {}

  createMainWindow(): BrowserWindowInstance {
    const mainWindow = new this.browserWindowClass({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(this.currentDirectory, '../preload.js'),
      },
    });

    const devServerUrl = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
    const appName = process.env.MAIN_WINDOW_VITE_NAME;

    if (devServerUrl) {
      void mainWindow.loadURL(devServerUrl);
      return mainWindow;
    }

    if (!appName) {
      throw new Error('MAIN_WINDOW_VITE_NAME is not defined.');
    }

    void mainWindow.loadFile(path.join(this.currentDirectory, `../renderer/${appName}/index.html`));
    return mainWindow;
  }
}
