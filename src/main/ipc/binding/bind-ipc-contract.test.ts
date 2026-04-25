
import { z } from 'zod';
import { defineIpcContract } from '../../../shared/ipc/define-ipc-contract';
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
});
