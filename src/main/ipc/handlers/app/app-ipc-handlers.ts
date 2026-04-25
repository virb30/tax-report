import type { IpcContractHandler } from '../../binding/bind-ipc-contract';
import type { healthCheckContract } from '../../../../shared/ipc/contracts/app';

export type AppIpcHandlers = {
  healthCheck: IpcContractHandler<typeof healthCheckContract>;
};

export function createAppIpcHandlers(): AppIpcHandlers {
  return {
    healthCheck: () => ({ status: 'ok' }),
  };
}
