import type { App } from 'electron';
import { AppLifecycle } from '../../app-lifecycle';
import {
  registerMainHandlers,
  type MainHandlersDependencies,
} from '../../ipc/handlers/register-main-handlers';

type BrowserWindowDependency = {
  getAllWindows: () => unknown[];
};

type IpcMainDependency = {
  handle: (
    channel: string,
    listener: (_event: unknown, ...args: unknown[]) => unknown,
  ) => void;
};

type LifecycleAppDependency = {
  on: (event: 'activate' | 'window-all-closed', listener: () => void) => void;
  whenReady: () => Promise<void>;
  quit: () => void;
};

export type CreateMainLifecycleDependencies = {
  app: Pick<App, 'on' | 'whenReady' | 'quit'>;
  browserWindow: BrowserWindowDependency;
  ipcMain: IpcMainDependency;
  mainHandlersDependencies: MainHandlersDependencies;
  platform: NodeJS.Platform;
  createMainWindow: () => void;
  onReady?: () => void | Promise<void>;
};

export function createMainLifecycle(
  dependencies: CreateMainLifecycleDependencies,
): AppLifecycle {
  registerMainHandlers(dependencies.ipcMain, dependencies.mainHandlersDependencies);
  const lifecycleApp = dependencies.app as unknown as LifecycleAppDependency;

  return new AppLifecycle({
    app: lifecycleApp,
    browserWindow: dependencies.browserWindow,
    createMainWindow: dependencies.createMainWindow,
    platform: dependencies.platform,
    onReady: dependencies.onReady,
  });
}
