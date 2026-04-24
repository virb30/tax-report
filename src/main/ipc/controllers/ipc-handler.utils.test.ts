import { describe, expect, it, jest } from '@jest/globals';
import { z } from 'zod';
import {
  buildIpcErrorMessage,
  parseIpcPayload,
  registerValidatedHandler,
} from './ipc-handler.utils';
import type { IpcMainHandleRegistry } from './ipc-controller.interface';

type RegisteredHandler = (
  event: Electron.IpcMainInvokeEvent,
  input: unknown,
) => Promise<unknown>;

describe('ipc-handler utils', () => {
  const ipcEvent = {} as Electron.IpcMainInvokeEvent;

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

  it('preserves non-zod errors raised while parsing payloads', () => {
    const schema = z.object({ value: z.string() }).transform(() => {
      throw new TypeError('Falha inesperada.');
    });

    expect(() => parseIpcPayload(schema, { value: 'payload' })).toThrow('Falha inesperada.');
  });

  it('formats generic errors and unknown values with the right message', () => {
    expect(buildIpcErrorMessage(new Error('Falha explícita.'))).toBe('Falha explícita.');
    expect(buildIpcErrorMessage('erro-desconhecido', 'Fallback padrão.')).toBe('Fallback padrão.');
  });

  it('registers a handler that executes parsed payloads', async () => {
    const handlerMap = new Map<string, RegisteredHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: jest.fn((channel: string, handler: RegisteredHandler) => {
        handlerMap.set(channel, handler);
      }),
    };

    registerValidatedHandler(ipcMain, {
      channel: 'portfolio:list-positions',
      schema: z.object({ baseYear: z.number().int() }),
      payloadErrorMessage: 'Payload inválido.',
      execute: (payload) => ({ receivedYear: payload.baseYear }),
    });

    const handler = handlerMap.get('portfolio:list-positions');
    expect(handler).toBeDefined();
    await expect(handler?.(ipcEvent, { baseYear: 2025 })).resolves.toEqual({ receivedYear: 2025 });
  });

  it('lets callers convert handler errors into controller-specific results', async () => {
    const handlerMap = new Map<string, RegisteredHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: jest.fn((channel: string, handler: RegisteredHandler) => {
        handlerMap.set(channel, handler);
      }),
    };

    registerValidatedHandler(ipcMain, {
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
    await expect(handler?.(ipcEvent, { name: '' })).resolves.toEqual({
      success: false,
      error: 'Nome inválido.',
    });
  });

  it('rethrows errors when the controller does not provide an onError mapper', async () => {
    const handlerMap = new Map<string, RegisteredHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: jest.fn((channel: string, handler: RegisteredHandler) => {
        handlerMap.set(channel, handler);
      }),
    };

    registerValidatedHandler(ipcMain, {
      channel: 'portfolio:set-initial-balance',
      schema: z.object({ ticker: z.string().min(1) }),
      execute: () => Promise.reject(new Error('Falha sem fallback.')),
    });

    const handler = handlerMap.get('portfolio:set-initial-balance');

    await expect(handler?.(ipcEvent, { ticker: 'PETR4' })).rejects.toThrow('Falha sem fallback.');
  });
});
