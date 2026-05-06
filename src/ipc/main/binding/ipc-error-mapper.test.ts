import { AppError } from '../../../main/shared/app-error';
import { toIpcResultFailure } from './ipc-error-mapper';
import { INVALID_IPC_PAYLOAD_CODE } from './ipc-payload';

describe('ipc error mapper', () => {
  it('maps validation app errors to typed IPC result failures', () => {
    const result = toIpcResultFailure(
      new AppError(INVALID_IPC_PAYLOAD_CODE, 'Value is required.', 'validation'),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Value is required.',
        kind: 'validation',
      },
    });
  });

  it('preserves known app error fields in typed IPC result failures', () => {
    const details = { brokerId: 'broker-1' };
    const result = toIpcResultFailure(
      new AppError('BROKER_NOT_FOUND', 'Broker was not found.', 'not_found', details),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'BROKER_NOT_FOUND',
        message: 'Broker was not found.',
        kind: 'not_found',
        details,
      },
    });
  });

  it('maps unknown errors to generic unexpected typed IPC result failures', () => {
    const result = toIpcResultFailure(new Error('Sensitive implementation detail.'));

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Erro inesperado ao processar a requisição.',
        kind: 'unexpected',
      },
    });
  });
});
