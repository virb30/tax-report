import { healthCheckContract } from '../../../../ipc/contracts/app/contracts';
import { bindIpcContract } from '../../../../ipc/main/binding/bind-ipc-contract';
import type { AppModule } from './types';

export function createAppModule(): AppModule {
  return {
    registerIpc(ipcMain) {
      bindIpcContract(ipcMain, healthCheckContract, () => ({ status: 'ok' as const }));
    },
  };
}
