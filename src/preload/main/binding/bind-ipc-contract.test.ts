import { z } from 'zod';
import { AppError } from '../../../main/shared/app-error';
import { defineIpcContract } from '../../ipc/define-ipc-contract';
import type { IpcResult } from '../../ipc/ipc-result';
import type { IpcMainHandleRegistry } from '../registry/ipc-registrar';
import { bindIpcContract } from './bind-ipc-contract';
import { toIpcFailureResult } from './ipc-error-mapper';

type RegisteredHandler = (event: Electron.IpcMainInvokeEvent, input: unknown) => Promise<unknown>;

type ResultContractOutput =
  | {
      success: true;
      value: string;
    }
  | {
      success: false;
      error: string;
    };

type TypedResultContractOutput = IpcResult<{ value: string }>;

function createIpcRegistry(): {
  ipcMain: IpcMainHandleRegistry;
  handlers: Map<string, RegisteredHandler>;
} {
  const handlers = new Map<string, RegisteredHandler>();
  const ipcMain: IpcMainHandleRegistry = {
    handle: jest.fn((channel: string, handler: RegisteredHandler) => {
      handlers.set(channel, handler);
    }),
  };

  return { ipcMain, handlers };
}

describe('bindIpcContract', () => {
  const ipcEvent = {} as Electron.IpcMainInvokeEvent;

  it('validates payloads and delegates parsed input to the contract handler', async () => {
    const contract = defineIpcContract<{ receivedValue: string }>()({
      id: 'test.echo',
      channel: 'test:echo',
      inputSchema: z.object({ value: z.string().trim().min(1) }),
      errorMode: 'throw',
      exposeToRenderer: true,
      api: { name: 'echo' },
    });
    const { ipcMain, handlers } = createIpcRegistry();

    bindIpcContract(ipcMain, contract, (payload) => ({ receivedValue: payload.value }));

    await expect(handlers.get('test:echo')?.(ipcEvent, { value: 'payload' })).resolves.toEqual({
      receivedValue: 'payload',
    });
  });

  it('rejects invalid payloads for throw-mode contracts', async () => {
    const contract = defineIpcContract<{ receivedValue: string }>()({
      id: 'test.throw',
      channel: 'test:throw',
      inputSchema: z.object({ value: z.string().min(1, 'Value is required.') }),
      errorMode: 'throw',
      exposeToRenderer: true,
      api: { name: 'throwingEcho' },
    });
    const { ipcMain, handlers } = createIpcRegistry();

    bindIpcContract(ipcMain, contract, (payload) => ({ receivedValue: payload.value }));

    await expect(handlers.get('test:throw')?.(ipcEvent, { value: '' })).rejects.toThrow(
      'Value is required.',
    );
  });

  it('rejects handler failures for throw-mode contracts', async () => {
    const contract = defineIpcContract<{ receivedValue: string }>()({
      id: 'test.throwHandlerFailure',
      channel: 'test:throw-handler-failure',
      inputSchema: z.object({ value: z.string() }),
      errorMode: 'throw',
      exposeToRenderer: true,
      api: { name: 'throwingHandlerEcho' },
    });
    const { ipcMain, handlers } = createIpcRegistry();

    bindIpcContract(ipcMain, contract, () => {
      throw new Error('Handler failed.');
    });

    await expect(
      handlers.get('test:throw-handler-failure')?.(ipcEvent, { value: 'payload' }),
    ).rejects.toThrow('Handler failed.');
  });

  it('maps handler failures for result-mode contracts', async () => {
    const contract = defineIpcContract<ResultContractOutput>()({
      id: 'test.result',
      channel: 'test:result',
      inputSchema: z.object({ value: z.string() }),
      errorMode: 'result',
      exposeToRenderer: true,
      api: { name: 'resultEcho' },
    });
    const { ipcMain, handlers } = createIpcRegistry();

    bindIpcContract(
      ipcMain,
      contract,
      () => {
        throw new Error('Handler failed.');
      },
      {
        onError: (error) => toIpcFailureResult(error, 'Fallback failure.'),
      },
    );

    await expect(handlers.get('test:result')?.(ipcEvent, { value: 'payload' })).resolves.toEqual({
      success: false,
      error: 'Handler failed.',
    });
  });

  it('maps validation failures for result-mode contracts', async () => {
    const contract = defineIpcContract<ResultContractOutput>()({
      id: 'test.resultValidation',
      channel: 'test:result-validation',
      inputSchema: z.object({ value: z.string().min(1, 'Value is required.') }),
      errorMode: 'result',
      exposeToRenderer: true,
      api: { name: 'resultValidationEcho' },
    });
    const { ipcMain, handlers } = createIpcRegistry();

    bindIpcContract(
      ipcMain,
      contract,
      (payload) => ({ success: true as const, value: payload.value }),
      {
        onError: (error) => toIpcFailureResult(error, 'Fallback failure.'),
      },
    );

    await expect(
      handlers.get('test:result-validation')?.(ipcEvent, { value: '' }),
    ).resolves.toEqual({
      success: false,
      error: 'Value is required.',
    });
  });

  it('maps validation failures to typed failures for result-mode contracts by default', async () => {
    const contract = defineIpcContract<TypedResultContractOutput>()({
      id: 'test.typedResultValidation',
      channel: 'test:typed-result-validation',
      inputSchema: z.object({ value: z.string().min(1, 'Value is required.') }),
      errorMode: 'result',
      exposeToRenderer: true,
      api: { name: 'typedResultValidationEcho' },
    });
    const { ipcMain, handlers } = createIpcRegistry();

    bindIpcContract(ipcMain, contract, (payload) => ({
      ok: true as const,
      data: { value: payload.value },
    }));

    await expect(
      handlers.get('test:typed-result-validation')?.(ipcEvent, { value: '' }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Value is required.',
        kind: 'validation',
      },
    });
  });

  it('maps known app errors to typed failures preserving error fields', async () => {
    const details = { ticker: 'PETR4', year: 2025 };
    const contract = defineIpcContract<TypedResultContractOutput>()({
      id: 'test.typedResultAppError',
      channel: 'test:typed-result-app-error',
      inputSchema: z.object({ value: z.string() }),
      errorMode: 'result',
      exposeToRenderer: true,
      api: { name: 'typedResultAppErrorEcho' },
    });
    const { ipcMain, handlers } = createIpcRegistry();

    bindIpcContract(ipcMain, contract, () => {
      throw new AppError('POSITION_NOT_FOUND', 'Position was not found.', 'not_found', details);
    });

    await expect(
      handlers.get('test:typed-result-app-error')?.(ipcEvent, { value: 'payload' }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'POSITION_NOT_FOUND',
        message: 'Position was not found.',
        kind: 'not_found',
        details,
      },
    });
  });

  it('maps unknown errors to generic unexpected typed failures', async () => {
    const contract = defineIpcContract<TypedResultContractOutput>()({
      id: 'test.typedResultUnknownError',
      channel: 'test:typed-result-unknown-error',
      inputSchema: z.object({ value: z.string() }),
      errorMode: 'result',
      exposeToRenderer: true,
      api: { name: 'typedResultUnknownErrorEcho' },
    });
    const { ipcMain, handlers } = createIpcRegistry();

    bindIpcContract(ipcMain, contract, () => {
      throw new Error('Database password leaked in stack trace.');
    });

    await expect(
      handlers.get('test:typed-result-unknown-error')?.(ipcEvent, { value: 'payload' }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Erro inesperado ao processar a requisição.',
        kind: 'unexpected',
      },
    });
  });
});
