import { describe, expect, it, jest } from '@jest/globals';
import { z } from 'zod';
import {
  buildIpcErrorMessage,
  parseIpcPayload,
  registerValidatedHandler,
} from './ipc-handler.utils';

describe('ipc-handler utils', () => {
  it('parses object payloads and returns first zod issue message', () => {
    const schema = z.object({
      baseYear: z.number().int('Ano inválido.'),
    });

    expect(parseIpcPayload(schema, { baseYear: 2025 })).toEqual({ baseYear: 2025 });
    expect(() =>
      parseIpcPayload(schema, { baseYear: '2025' }, { payloadErrorMessage: 'Payload inválido.' }),
    ).toThrow('Invalid input: expected number, received string');
    expect(() =>
      parseIpcPayload(schema, null, { payloadErrorMessage: 'Payload inválido.' }),
    ).toThrow('Payload inválido.');
  });

  it('supports optional payloads when object input is not required', () => {
    const schema = z
      .object({
        activeOnly: z.boolean().optional(),
      })
      .optional()
      .catch(undefined);

    expect(parseIpcPayload(schema, undefined, { requireObjectInput: false })).toBeUndefined();
  });

  it('registers a handler that executes parsed payloads', async () => {
    const handlerMap = new Map<string, (_event: unknown, input: unknown) => Promise<unknown>>();
    const ipcMain = {
      handle: jest.fn(
        (channel: string, handler: (_event: unknown, input: unknown) => Promise<unknown>) => {
          handlerMap.set(channel, handler);
        },
      ),
    };

    registerValidatedHandler(ipcMain as unknown as Electron.IpcMain, {
      channel: 'portfolio:list-positions',
      schema: z.object({ baseYear: z.number().int() }),
      payloadErrorMessage: 'Payload inválido.',
      execute: (payload) => ({ receivedYear: payload.baseYear }),
    });

    const handler = handlerMap.get('portfolio:list-positions');
    expect(handler).toBeDefined();
    await expect(handler?.({}, { baseYear: 2025 })).resolves.toEqual({ receivedYear: 2025 });
  });

  it('lets callers convert handler errors into controller-specific results', async () => {
    const handlerMap = new Map<string, (_event: unknown, input: unknown) => Promise<unknown>>();
    const ipcMain = {
      handle: jest.fn(
        (channel: string, handler: (_event: unknown, input: unknown) => Promise<unknown>) => {
          handlerMap.set(channel, handler);
        },
      ),
    };

    registerValidatedHandler(ipcMain as unknown as Electron.IpcMain, {
      channel: 'brokers:create',
      schema: z.object({ name: z.string().min(1, 'Nome inválido.') }),
      payloadErrorMessage: 'Payload inválido.',
      execute: () => ({ success: true as const }),
      onError: (error) => ({
        success: false as const,
        error: buildIpcErrorMessage(error, 'Erro ao criar corretora.'),
      }),
    });

    const handler = handlerMap.get('brokers:create');
    await expect(handler?.({}, { name: '' })).resolves.toEqual({
      success: false,
      error: 'Nome inválido.',
    });
  });
});
