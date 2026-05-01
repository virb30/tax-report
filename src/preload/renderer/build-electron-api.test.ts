import { jest } from '@jest/globals';
import { z } from 'zod';
import { defineIpcContract } from '../ipc/define-ipc-contract';
import { buildElectronApi } from './build-electron-api';

const firstContract = defineIpcContract<void>()({
  id: 'test.first',
  channel: 'test:first',
  inputSchema: z.object({ id: z.string() }),
  errorMode: 'throw',
  exposeToRenderer: true,
  api: { name: 'first' },
});

const secondContract = defineIpcContract<void>()({
  id: 'test.second',
  channel: 'test:second',
  inputSchema: z.void(),
  errorMode: 'throw',
  exposeToRenderer: true,
  api: { name: 'second' },
});

describe('buildElectronApi', () => {
  it('builds renderer methods from exposed IPC contracts', async () => {
    const invoke = jest.fn<(channel: string, input?: unknown) => Promise<unknown>>();
    invoke.mockResolvedValue(undefined);
    const api = buildElectronApi({ invoke }, [firstContract, secondContract]);

    await (api.first as (input: unknown) => Promise<unknown>)({ id: 'abc' });
    await (api.second as () => Promise<unknown>)();

    expect(api.appName).toBe('tax-report');
    expect(invoke).toHaveBeenNthCalledWith(1, 'test:first', { id: 'abc' });
    expect(invoke).toHaveBeenNthCalledWith(2, 'test:second');
  });

  it('rejects duplicate renderer API names', () => {
    const duplicateApiNameContract = defineIpcContract<void>()({
      id: 'test.duplicateApi',
      channel: 'test:duplicate-api',
      inputSchema: z.void(),
      errorMode: 'throw',
      exposeToRenderer: true,
      api: { name: 'first' },
    });

    expect(() =>
      buildElectronApi({ invoke: jest.fn<() => Promise<unknown>>() }, [
        firstContract,
        duplicateApiNameContract,
      ]),
    ).toThrow('Duplicate renderer API name: first');
  });

  it('rejects duplicate renderer IPC channels', () => {
    const duplicateChannelContract = defineIpcContract<void>()({
      id: 'test.duplicateChannel',
      channel: 'test:first',
      inputSchema: z.void(),
      errorMode: 'throw',
      exposeToRenderer: true,
      api: { name: 'duplicateChannel' },
    });

    expect(() =>
      buildElectronApi({ invoke: jest.fn<() => Promise<unknown>>() }, [
        firstContract,
        duplicateChannelContract,
      ]),
    ).toThrow('Duplicate renderer IPC channel: test:first');
  });
});
