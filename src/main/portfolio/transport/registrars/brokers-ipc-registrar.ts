import type {
  IpcMainHandleRegistry,
  IpcRegistrar,
} from '../../../../preload/main/registry/ipc-registrar';
import type { CreateBrokerUseCase } from '../../application/use-cases/create-broker/create-broker.use-case';
import type { ListBrokersUseCase } from '../../application/use-cases/list-brokers/list-brokers.use-case';
import type { UpdateBrokerUseCase } from '../../application/use-cases/update-broker/update-broker.use-case';
import type { ToggleActiveBrokerUseCase } from '../../application/use-cases/toggle-active-broker/toggle-active-broker.use-case';
import { bindIpcContract } from '../../../../preload/main/binding/bind-ipc-contract';
import { toIpcFailureResult } from '../../../../preload/main/binding/ipc-error-mapper';
import { createBrokerIpcHandlers } from '../handlers/brokers/broker-ipc-handlers';
import {
  brokerIpcContracts,
  createBrokerContract,
  listBrokersContract,
  toggleBrokerActiveContract,
  updateBrokerContract,
} from '../../../../preload/contracts/portfolio/brokers';

export class BrokersIpcRegistrar implements IpcRegistrar {
  constructor(
    private readonly listBrokersUseCase: ListBrokersUseCase,
    private readonly createBrokerUseCase: CreateBrokerUseCase,
    private readonly updateBrokerUseCase: UpdateBrokerUseCase,
    private readonly toggleActiveBrokerUseCase: ToggleActiveBrokerUseCase,
  ) {}

  register(ipcMain: IpcMainHandleRegistry): string[] {
    const handlers = createBrokerIpcHandlers(
      this.listBrokersUseCase,
      this.createBrokerUseCase,
      this.updateBrokerUseCase,
      this.toggleActiveBrokerUseCase,
    );

    bindIpcContract(ipcMain, listBrokersContract, handlers.list);

    bindIpcContract(ipcMain, createBrokerContract, handlers.create, {
      onError: (error) => {
        console.error(error);
        return toIpcFailureResult(error, 'Erro ao criar corretora.');
      },
    });

    bindIpcContract(ipcMain, updateBrokerContract, handlers.update, {
      onError: (error) => {
        console.error(error);
        return toIpcFailureResult(error, 'Erro ao atualizar corretora.');
      },
    });

    bindIpcContract(ipcMain, toggleBrokerActiveContract, handlers.toggleActive, {
      onError: (error) => {
        console.error(error);
        return toIpcFailureResult(error, 'Erro ao ativar/desativar corretora.');
      },
    });

    return brokerIpcContracts.map((contract) => contract.channel);
  }
}
