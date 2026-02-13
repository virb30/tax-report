import { GetAppHealthUseCase } from '../../application/use-cases/get-app-health-use-case';

type IpcMainLike = {
  handle: (
    channel: string,
    listener: (_event: unknown, ...args: unknown[]) => unknown,
  ) => void;
};

export function registerMainHandlers(ipcMain: IpcMainLike): string[] {
  const getAppHealthUseCase = new GetAppHealthUseCase();
  const registeredChannels = ['app:health-check'];

  ipcMain.handle('app:health-check', () => {
    return getAppHealthUseCase.execute();
  });

  return registeredChannels;
}
