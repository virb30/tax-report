import { z } from 'zod';
import type {
  CreateBrokerResult,
  ListBrokersResult,
  ToggleBrokerActiveResult,
  UpdateBrokerResult,
} from '../../../contracts/brokers.contract';
import { defineIpcContract } from '../../define-ipc-contract';
import { BROKERS_IPC_CHANNELS } from '../../ipc-channels';

export const listBrokersSchema = z
  .object({
    activeOnly: z.boolean().optional(),
  })
  .optional()
  .catch(undefined);

export const createBrokerSchema = z
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

export const updateBrokerSchema = z.object({
  id: z.string().trim().min(1, 'Invalid id for update broker.'),
  name: z.string().optional(),
  cnpj: z.string().optional(),
  code: z.string().optional(),
});

export const toggleActiveBrokerSchema = z.object({
  id: z.string().trim().min(1, 'Invalid id for toggle broker active.'),
});

export const listBrokersContract = defineIpcContract<ListBrokersResult>()({
  id: 'brokers.list',
  channel: BROKERS_IPC_CHANNELS.list,
  inputSchema: listBrokersSchema,
  errorMode: 'throw',
  exposeToRenderer: true,
  api: { name: 'listBrokers' },
  requireObjectInput: false,
});

export const createBrokerContract = defineIpcContract<CreateBrokerResult>()({
  id: 'brokers.create',
  channel: BROKERS_IPC_CHANNELS.create,
  inputSchema: createBrokerSchema,
  errorMode: 'result',
  exposeToRenderer: true,
  api: { name: 'createBroker' },
  payloadErrorMessage: 'Invalid payload for create broker.',
});

export const updateBrokerContract = defineIpcContract<UpdateBrokerResult>()({
  id: 'brokers.update',
  channel: BROKERS_IPC_CHANNELS.update,
  inputSchema: updateBrokerSchema,
  errorMode: 'result',
  exposeToRenderer: true,
  api: { name: 'updateBroker' },
  payloadErrorMessage: 'Invalid payload for update broker.',
});

export const toggleBrokerActiveContract = defineIpcContract<ToggleBrokerActiveResult>()({
  id: 'brokers.toggleActive',
  channel: BROKERS_IPC_CHANNELS.toggleActive,
  inputSchema: toggleActiveBrokerSchema,
  errorMode: 'result',
  exposeToRenderer: true,
  api: { name: 'toggleBrokerActive' },
  payloadErrorMessage: 'Invalid payload for toggle broker active.',
});

export const brokerIpcContracts = [
  listBrokersContract,
  createBrokerContract,
  updateBrokerContract,
  toggleBrokerActiveContract,
] as const;
