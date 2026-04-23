import { z } from 'zod';
import type { IpcController } from './ipc-controller.interface';
import type { CreateBrokerUseCase } from '../../application/use-cases/create-broker/create-broker.use-case';
import type { ListBrokersUseCase } from '../../application/use-cases/list-brokers/list-brokers.use-case';
import type { UpdateBrokerUseCase } from '../../application/use-cases/update-broker/update-broker.use-case';
import type { ToggleActiveBrokerUseCase } from '../../application/use-cases/toggle-active-broker/toggle-active-broker.use-case';
import { buildIpcErrorMessage, registerValidatedHandler } from './ipc-handler.utils';

const listBrokersSchema = z
  .object({
    activeOnly: z.boolean().optional(),
  })
  .optional()
  .catch(undefined);

const createBrokerSchema = z
  .object({
    name: z.string({ message: 'Invalid name for create broker.' }),
    cnpj: z.string({ message: 'Invalid CNPJ for create broker.' }),
    code: z.string().optional(),
    codigo: z.string().optional(),
  })
  .refine((data) => data.code !== undefined || data.codigo !== undefined, {
    message: 'Invalid code for create broker.',
    path: ['code'],
  })
  .transform((data) => ({
    name: data.name,
    cnpj: data.cnpj,
    code: (data.code ?? data.codigo) as string,
  }));

const updateBrokerSchema = z.object({
  id: z.string().trim().min(1, 'Invalid id for update broker.'),
  name: z.string().optional(),
  cnpj: z.string().optional(),
  code: z.string().optional(),
});

const toggleActiveBrokerSchema = z.object({
  id: z.string().trim().min(1, 'Invalid id for toggle broker active.'),
});

export class BrokersController implements IpcController {
  constructor(
    private readonly listBrokersUseCase: ListBrokersUseCase,
    private readonly createBrokerUseCase: CreateBrokerUseCase,
    private readonly updateBrokerUseCase: UpdateBrokerUseCase,
    private readonly toggleActiveBrokerUseCase: ToggleActiveBrokerUseCase,
  ) {}

  register(ipcMain: Electron.IpcMain): string[] {
    const channels = ['brokers:list', 'brokers:create', 'brokers:update', 'brokers:toggle-active'];

    registerValidatedHandler(ipcMain, {
      channel: 'brokers:list',
      schema: listBrokersSchema,
      requireObjectInput: false,
      execute: (payload) => this.listBrokersUseCase.execute(payload),
    });

    registerValidatedHandler(ipcMain, {
      channel: 'brokers:create',
      schema: createBrokerSchema,
      payloadErrorMessage: 'Invalid payload for create broker.',
      execute: async (payload) => {
        const broker = await this.createBrokerUseCase.execute(payload);
        return { success: true as const, broker };
      },
      onError: (error) => {
        console.error(error);
        return {
          success: false as const,
          error: buildIpcErrorMessage(error, 'Erro ao criar corretora.'),
        };
      },
    });

    registerValidatedHandler(ipcMain, {
      channel: 'brokers:update',
      schema: updateBrokerSchema,
      payloadErrorMessage: 'Invalid payload for update broker.',
      execute: async (payload) => {
        const broker = await this.updateBrokerUseCase.execute(payload);
        return { success: true as const, broker };
      },
      onError: (error) => {
        console.error(error);
        return {
          success: false as const,
          error: buildIpcErrorMessage(error, 'Erro ao atualizar corretora.'),
        };
      },
    });

    registerValidatedHandler(ipcMain, {
      channel: 'brokers:toggle-active',
      schema: toggleActiveBrokerSchema,
      payloadErrorMessage: 'Invalid payload for toggle broker active.',
      execute: async (payload) => {
        const broker = await this.toggleActiveBrokerUseCase.execute(payload);
        return { success: true as const, broker };
      },
      onError: (error) => {
        console.error(error);
        return {
          success: false as const,
          error: buildIpcErrorMessage(error, 'Erro ao ativar/desativar corretora.'),
        };
      },
    });

    return channels;
  }
}
