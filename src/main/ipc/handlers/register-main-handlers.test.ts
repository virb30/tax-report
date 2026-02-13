import { describe, expect, it, jest } from '@jest/globals';
import { registerMainHandlers } from './register-main-handlers';

describe('registerMainHandlers', () => {
  it('registers health-check channel and returns channel list', () => {
    const handle = jest.fn();

    const channels = registerMainHandlers({ handle });

    expect(channels).toEqual(['app:health-check']);
    expect(handle).toHaveBeenCalledTimes(1);
    expect(handle).toHaveBeenCalledWith('app:health-check', expect.any(Function));
  });

  it('returns health status from registered handler', () => {
    const handle = jest.fn();
    registerMainHandlers({ handle });

    const handler = handle.mock.calls[0]?.[1] as (() => unknown) | undefined;
    if (!handler) {
      throw new Error('IPC health handler not registered.');
    }

    expect(handler()).toEqual({ status: 'ok' });
  });
});
