import type {
  IpcMainHandleRegistry,
  IpcRegistrar,
} from '../../../../ipc/main/registry/ipc-registrar';
import { bindIpcContract } from '../../../../ipc/main/binding/bind-ipc-contract';
import { createAppIpcHandlers } from '../handlers/app/app-ipc-handlers';
import { appIpcContracts, healthCheckContract } from '../../../../ipc/contracts/app/contracts';

export class AppIpcRegistrar implements IpcRegistrar {
  register(ipcMain: IpcMainHandleRegistry): string[] {
    const handlers = createAppIpcHandlers();

    bindIpcContract(ipcMain, healthCheckContract, handlers.healthCheck);

    return appIpcContracts.map((contract) => contract.channel);
  }
}
