import { z } from 'zod';
import type {
  CreateBrokerResult,
  ToggleBrokerActiveResult,
  UpdateBrokerResult,
} from './contracts/portfolio/brokers.contract';
import type { IpcContractOutput } from './contract-types';
import { defineIpcContract } from './define-ipc-contract';
import { ipcFailure, type IpcResult, ipcSuccess } from './ipc-result';

type Equal<TActual, TExpected> =
  (<T>() => T extends TActual ? 1 : 2) extends <T>() => T extends TExpected ? 1 : 2 ? true : false;

function expectType<T extends true>(value: T): T {
  expect(value).toBe(true);
  return value;
}

describe('shared IPC result primitives', () => {
  it('creates success results preserving the supplied data payload', () => {
    const data = { items: [{ ticker: 'PETR4', quantity: 10 }] };

    const result = ipcSuccess(data);

    expect(result).toEqual({ ok: true, data });
  });

  it('creates failure results preserving serializable error fields', () => {
    const details = { id: 'position-1' };
    const error = {
      code: 'POSITION_NOT_FOUND',
      message: 'Position was not found.',
      kind: 'not_found' as const,
      details,
    };

    const result = ipcFailure(error);

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'POSITION_NOT_FOUND',
        message: 'Position was not found.',
        kind: 'not_found',
        details,
      },
    });
  });

  it('keeps failure result details optional when no details are supplied', () => {
    const result = ipcFailure({
      code: 'UNEXPECTED_ERROR',
      message: 'Unexpected failure.',
      kind: 'unexpected',
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Unexpected failure.',
        kind: 'unexpected',
      },
    });
    if (!result.ok) {
      expect(result.error).not.toHaveProperty('details');
    }
  });

  it('allows void success payloads', () => {
    const result: IpcResult<void> = ipcSuccess(undefined);

    expect(result).toEqual({ ok: true, data: undefined });
  });

  it('keeps IPC contract output inference compatible with IpcResult outputs', () => {
    type PositionOutput = IpcResult<{ items: Array<{ ticker: string }> }>;

    const contract = defineIpcContract<PositionOutput>()({
      id: 'test.positions',
      channel: 'test:positions',
      inputSchema: z.object({ baseYear: z.number().int() }),
      errorMode: 'result',
      exposeToRenderer: true,
      api: { name: 'testPositions' },
    });

    type InferredOutput = IpcContractOutput<typeof contract>;

    expectType<Equal<InferredOutput, PositionOutput>>(true);
    expect(contract).toMatchObject({
      id: 'test.positions',
      channel: 'test:positions',
      errorMode: 'result',
    });
    expect(ipcSuccess({ items: [{ ticker: 'PETR4' }] }) satisfies InferredOutput).toEqual({
      ok: true,
      data: { items: [{ ticker: 'PETR4' }] },
    });
  });

  it('keeps legacy broker result types independent from IpcResult', () => {
    type ExpectedUpdateBrokerResult =
      | {
          success: true;
          broker: { id: string; name: string; cnpj: string; code: string; active: boolean };
        }
      | { success: false; error: string };
    type ExpectedToggleBrokerActiveResult = ExpectedUpdateBrokerResult;
    type ExpectedCreateBrokerResult = ExpectedUpdateBrokerResult;

    expectType<Equal<UpdateBrokerResult, ExpectedUpdateBrokerResult>>(true);
    expectType<Equal<ToggleBrokerActiveResult, ExpectedToggleBrokerActiveResult>>(true);
    expectType<Equal<CreateBrokerResult, ExpectedCreateBrokerResult>>(true);

    const legacyFailure: CreateBrokerResult = { success: false, error: 'Broker failed.' };

    expect(legacyFailure).toEqual({ success: false, error: 'Broker failed.' });
    expect('ok' in legacyFailure).toBe(false);
  });
});
