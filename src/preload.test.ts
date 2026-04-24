import { describe, expect, it, jest } from '@jest/globals';
import { ELECTRON_API_CHANNELS, REGISTERED_IPC_CHANNELS } from './shared/ipc/ipc-channels';

const exposeInMainWorld = jest.fn();
const invoke = jest.fn();

jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld,
  },
  ipcRenderer: {
    invoke,
  },
}));
import { electronApi } from './preload';
import { AssetType } from './shared/types/domain';

describe('preload', () => {
  it('exposes electron API to renderer', () => {
    expect(exposeInMainWorld).toHaveBeenCalledWith('electronApi', electronApi);
  });

  it('exposes app metadata', () => {
    expect(electronApi.appName).toBe('tax-report');
  });

  it('invokes whitelisted IPC channels', async () => {
    await electronApi.previewImportTransactions({
      filePath: '/tmp/operations.csv',
    });
    await electronApi.confirmImportTransactions({
      filePath: '/tmp/operations.csv',
    });
    await electronApi.setInitialBalance({
      ticker: 'IVVB11',
      brokerId: 'broker-xp',
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
      year: 2025,
    });
    await electronApi.listPositions({ baseYear: 2025 });
    await electronApi.generateAssetsReport({ baseYear: 2025 });

    expect(invoke).toHaveBeenNthCalledWith(1, ELECTRON_API_CHANNELS.previewImportTransactions, {
      filePath: '/tmp/operations.csv',
    });
    expect(invoke).toHaveBeenNthCalledWith(2, ELECTRON_API_CHANNELS.confirmImportTransactions, {
      filePath: '/tmp/operations.csv',
    });
    expect(invoke).toHaveBeenNthCalledWith(3, ELECTRON_API_CHANNELS.setInitialBalance, {
      ticker: 'IVVB11',
      brokerId: 'broker-xp',
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
      year: 2025,
    });
    expect(invoke).toHaveBeenNthCalledWith(4, ELECTRON_API_CHANNELS.listPositions, {
      baseYear: 2025,
    });
    expect(invoke).toHaveBeenNthCalledWith(5, ELECTRON_API_CHANNELS.generateAssetsReport, {
      baseYear: 2025,
    });
  });

  it('does not expose generic IPC surface to renderer', () => {
    const exposedKeys = Object.keys(electronApi).sort();
    expect(exposedKeys).toEqual([
      'appName',
      'confirmImportTransactions',
      'createBroker',
      'deletePosition',
      'generateAssetsReport',
      'importConsolidatedPosition',
      'importSelectFile',
      'listBrokers',
      'listPositions',
      'migrateYear',
      'previewConsolidatedPosition',
      'previewImportTransactions',
      'recalculatePosition',
      'setInitialBalance',
      'toggleBrokerActive',
      'updateBroker',
    ]);
    expect('invoke' in (electronApi as unknown as Record<string, unknown>)).toBe(false);
    expect('ipcRenderer' in (electronApi as unknown as Record<string, unknown>)).toBe(false);
  });

  it('keeps exposed preload channels aligned with registered main-process channels', () => {
    expect(
      Object.values(ELECTRON_API_CHANNELS).every((channel) => REGISTERED_IPC_CHANNELS.includes(channel)),
    ).toBe(true);
  });
});
