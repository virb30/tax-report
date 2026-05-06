import type { IpcContractHandler } from '../../../../../ipc/main/binding/bind-ipc-contract';
import type { healthCheckContract } from '../../../../../ipc/contracts/app';

export type AppIpcHandlers = {
  healthCheck: IpcContractHandler<typeof healthCheckContract>;
};

export function createAppIpcHandlers(): AppIpcHandlers {
  return {
    healthCheck: () => ({ status: 'ok' }),
  };
}
