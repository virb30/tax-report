import { describe, expect, it, jest } from '@jest/globals';

const exposeInMainWorld = jest.fn();

jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld,
  },
}));
import { electronApi } from './preload';

describe('preload', () => {
  it('exposes electron API to renderer', () => {
    expect(electronApi).toEqual({ appName: 'tax-report' });
    expect(exposeInMainWorld).toHaveBeenCalledWith('electronApi', { appName: 'tax-report' });
  });
});
