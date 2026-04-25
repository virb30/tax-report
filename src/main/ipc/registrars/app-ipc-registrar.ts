import type { IpcMainHandleRegistry, IpcRegistrar } from '../registry/ipc-registrar';
import { bindIpcContract } from '../binding/bind-ipc-contract';
import { createAppIpcHandlers } from '../handlers/app/app-ipc-handlers';
import { appIpcContracts, healthCheckContract } from '../../../shared/ipc/contracts/app';

export class AppIpcRegistrar implements IpcRegistrar {
  register(ipcMain: IpcMainHandleRegistry): string[] {
    const handlers = createAppIpcHandlers();

    bindIpcContract(ipcMain, healthCheckContract, handlers.healthCheck);

    return appIpcContracts.map((contract) => contract.channel);
  }
}
