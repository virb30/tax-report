import type {
  IpcMainHandleRegistry,
  IpcRegistrar,
} from '../../../../preload/main/registry/ipc-registrar';
import { bindIpcContract } from '../../../../preload/main/binding/bind-ipc-contract';
import { createAppIpcHandlers } from '../handlers/app/app-ipc-handlers';
import { appIpcContracts, healthCheckContract } from '../../../../preload/contracts/app/contracts';

export class AppIpcRegistrar implements IpcRegistrar {
  register(ipcMain: IpcMainHandleRegistry): string[] {
    const handlers = createAppIpcHandlers();

    bindIpcContract(ipcMain, healthCheckContract, handlers.healthCheck);

    return appIpcContracts.map((contract) => contract.channel);
  }
}
