
import { mock, mockReset } from 'jest-mock-extended';
import type { CreateBrokerUseCase } from '../../application/use-cases/create-broker/create-broker.use-case';
import type { ListBrokersUseCase } from '../../application/use-cases/list-brokers/list-brokers.use-case';
import type { ToggleActiveBrokerUseCase } from '../../application/use-cases/toggle-active-broker/toggle-active-broker.use-case';
import type { UpdateBrokerUseCase } from '../../application/use-cases/update-broker/update-broker.use-case';
import {
  brokerIpcContracts,
  createBrokerContract,
  listBrokersContract,
  toggleBrokerActiveContract,
  updateBrokerContract,
} from '../../../shared/ipc/contracts/brokers';
import type { IpcMainHandleRegistry } from '../registry/ipc-registrar';
import { BrokersIpcRegistrar } from './brokers-ipc-registrar';

type IpcHandler = (_event: Electron.IpcMainInvokeEvent, input?: unknown) => Promise<unknown>;

describe('BrokersIpcRegistrar', () => {
  const listBrokersUseCase = mock<ListBrokersUseCase>();
  const createBrokerUseCase = mock<CreateBrokerUseCase>();
  const updateBrokerUseCase = mock<UpdateBrokerUseCase>();
  const toggleActiveBrokerUseCase = mock<ToggleActiveBrokerUseCase>();
  const ipcEvent = {} as Electron.IpcMainInvokeEvent;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    mockReset(listBrokersUseCase);
    mockReset(createBrokerUseCase);
    mockReset(updateBrokerUseCase);
    mockReset(toggleActiveBrokerUseCase);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  function registerRegistrar(): Map<string, IpcHandler> {
    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel, listener) => {
        handlers.set(channel, listener as IpcHandler);
      },
    };

    const registrar = new BrokersIpcRegistrar(
      listBrokersUseCase,
      createBrokerUseCase,
      updateBrokerUseCase,
      toggleActiveBrokerUseCase,
    );

    expect(registrar.register(ipcMain)).toEqual(
      brokerIpcContracts.map((contract) => contract.channel),
    );

    return handlers;
  }

  it('lists brokers without requiring a payload object', async () => {
    listBrokersUseCase.execute.mockResolvedValue({ items: [] });
    const handlers = registerRegistrar();

    const listHandler = handlers.get(listBrokersContract.channel);

    await expect(listHandler?.(ipcEvent)).resolves.toEqual({ items: [] });
    expect(listBrokersUseCase.execute).toHaveBeenCalledWith(undefined);
  });

  it('accepts legacy codigo when creating a broker', async () => {
    createBrokerUseCase.execute.mockResolvedValue({
      id: 'broker-1',
      name: 'XP',
      cnpj: '12.345.678/0001-90',
      code: 'XP',
      active: true,
    });
    const handlers = registerRegistrar();

    const createHandler = handlers.get(createBrokerContract.channel);

    await expect(
      createHandler?.(ipcEvent, {
        name: 'XP',
        cnpj: '12.345.678/0001-90',
        codigo: 'XP',
      }),
    ).resolves.toEqual({
      success: true,
      broker: {
        id: 'broker-1',
        name: 'XP',
        cnpj: '12.345.678/0001-90',
        code: 'XP',
        active: true,
      },
    });

    expect(createBrokerUseCase.execute).toHaveBeenCalledWith({
      name: 'XP',
      cnpj: '12.345.678/0001-90',
      code: 'XP',
    });
  });

  it('converts create validation failures into a safe error payload', async () => {
    const handlers = registerRegistrar();
    const createHandler = handlers.get(createBrokerContract.channel);

    await expect(
      createHandler?.(ipcEvent, {
        name: 'XP',
        cnpj: '12.345.678/0001-90',
      }),
    ).resolves.toEqual({
      success: false,
      error: 'Invalid code for create broker.',
    });
  });

  it('converts update failures into a safe error payload', async () => {
    updateBrokerUseCase.execute.mockRejectedValue(new Error('Falha ao atualizar.'));
    const handlers = registerRegistrar();
    const updateHandler = handlers.get(updateBrokerContract.channel);

    await expect(
      updateHandler?.(ipcEvent, {
        id: 'broker-1',
        name: 'XP Atualizada',
      }),
    ).resolves.toEqual({
      success: false,
      error: 'Falha ao atualizar.',
    });
  });

  it('converts toggle failures into a safe error payload', async () => {
    toggleActiveBrokerUseCase.execute.mockRejectedValue(new Error('Falha ao alternar.'));
    const handlers = registerRegistrar();
    const toggleHandler = handlers.get(toggleBrokerActiveContract.channel);

    await expect(toggleHandler?.(ipcEvent, { id: 'broker-1' })).resolves.toEqual({
      success: false,
      error: 'Falha ao alternar.',
    });
  });
});
