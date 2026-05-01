import type { IpcContractHandler } from '../../../../../preload/main/binding/bind-ipc-contract';
import type { healthCheckContract } from '../../../../../preload/contracts/app';

export type AppIpcHandlers = {
  healthCheck: IpcContractHandler<typeof healthCheckContract>;
};

export function createAppIpcHandlers(): AppIpcHandlers {
  return {
    healthCheck: () => ({ status: 'ok' }),
  };
}
