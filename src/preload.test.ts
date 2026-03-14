import { describe, expect, it, jest } from '@jest/globals';

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

    expect(invoke).toHaveBeenNthCalledWith(1, 'import:preview-transactions', {
      filePath: '/tmp/operations.csv',
    });
    expect(invoke).toHaveBeenNthCalledWith(2, 'import:confirm-transactions', {
      filePath: '/tmp/operations.csv',
    });
    expect(invoke).toHaveBeenNthCalledWith(3, 'portfolio:set-initial-balance', {
      ticker: 'IVVB11',
      brokerId: 'broker-xp',
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
      year: 2025,
    });
    expect(invoke).toHaveBeenNthCalledWith(4, 'portfolio:list-positions', { baseYear: 2025 });
    expect(invoke).toHaveBeenNthCalledWith(5, 'report:assets-annual', { baseYear: 2025 });
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
});
