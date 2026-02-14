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
import { AssetType, OperationType, SourceType } from './shared/types/domain';

describe('preload', () => {
  it('exposes electron API to renderer', () => {
    expect(exposeInMainWorld).toHaveBeenCalledWith('electronApi', electronApi);
  });

  it('exposes app metadata', () => {
    expect(electronApi.appName).toBe('tax-report');
  });

  it('invokes whitelisted IPC channels', async () => {
    await electronApi.previewImportFromFile({
      broker: 'XP',
      filePath: '/tmp/operations.csv',
    });
    await electronApi.importOperations({
      tradeDate: '2025-01-20',
      broker: 'XP',
      sourceType: SourceType.Csv,
      totalOperationalCosts: 10,
      operations: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          operationType: OperationType.Buy,
          quantity: 10,
          unitPrice: 40,
          irrfWithheld: 0,
        },
      ],
    });
    await electronApi.confirmImportOperations({
      commands: [],
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

    expect(invoke).toHaveBeenNthCalledWith(1, 'import:preview-file', {
      broker: 'XP',
      filePath: '/tmp/operations.csv',
    });
    expect(invoke).toHaveBeenNthCalledWith(2, 'import:operations', {
      tradeDate: '2025-01-20',
      broker: 'XP',
      sourceType: SourceType.Csv,
      totalOperationalCosts: 10,
      operations: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          operationType: OperationType.Buy,
          quantity: 10,
          unitPrice: 40,
          irrfWithheld: 0,
        },
      ],
    });
    expect(invoke).toHaveBeenNthCalledWith(3, 'import:confirm-operations', {
      commands: [],
    });
    expect(invoke).toHaveBeenNthCalledWith(4, 'portfolio:set-initial-balance', {
      ticker: 'IVVB11',
      brokerId: 'broker-xp',
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
      year: 2025,
    });
    expect(invoke).toHaveBeenNthCalledWith(5, 'portfolio:list-positions', { baseYear: 2025 });
    expect(invoke).toHaveBeenNthCalledWith(6, 'report:assets-annual', { baseYear: 2025 });
  });

  it('does not expose generic IPC surface to renderer', () => {
    const exposedKeys = Object.keys(electronApi).sort();
    expect(exposedKeys).toEqual([
      'appName',
      'confirmImportOperations',
      'confirmImportTransactions',
      'createBroker',
      'deletePosition',
      'generateAssetsReport',
      'importConsolidatedPosition',
      'importOperations',
      'importSelectFile',
      'listBrokers',
      'listPositions',
      'migrateYear',
      'previewConsolidatedPosition',
      'previewImportFromFile',
      'previewImportTransactions',
      'recalculatePosition',
      'setInitialBalance',
    ]);
    expect('invoke' in (electronApi as unknown as Record<string, unknown>)).toBe(false);
    expect('ipcRenderer' in (electronApi as unknown as Record<string, unknown>)).toBe(false);
  });
});
