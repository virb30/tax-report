import { BrowserWindow } from 'electron';
import path from 'node:path';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string | undefined;

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
  private readonly openedWindows: BrowserWindowInstance[] = [];

  constructor(
    private readonly browserWindowClass: BrowserWindowConstructor = BrowserWindow,
    private readonly currentDirectory: string = __dirname,
  ) {}

  createMainWindow(): BrowserWindowInstance {
    const mainWindow = new this.browserWindowClass({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(this.currentDirectory, './preload.js'),
      },
    });

    /* istanbul ignore next -- provided by Vite define in app runtime, absent in Jest */
    const viteDevServerUrl =
      typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined'
        ? MAIN_WINDOW_VITE_DEV_SERVER_URL
        : undefined;
    /* istanbul ignore next -- provided by Vite define in app runtime, absent in Jest */
    const viteAppName = typeof MAIN_WINDOW_VITE_NAME !== 'undefined' ? MAIN_WINDOW_VITE_NAME : undefined;
    const devServerUrl = viteDevServerUrl ?? process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
    const appName = viteAppName ?? process.env.MAIN_WINDOW_VITE_NAME;
    this.openedWindows.push(mainWindow);

    if (devServerUrl) {
      void mainWindow.loadURL(devServerUrl);
      return mainWindow;
    }

    if (!appName) {
      throw new Error('MAIN_WINDOW_VITE_NAME is not defined.');
    }

    void mainWindow
      .loadFile(path.join(this.currentDirectory, `../renderer/${appName}/index.html`));
    return mainWindow;
  }
}
