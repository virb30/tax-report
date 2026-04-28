
import {
  confirmImportTransactionsContract,
  previewImportTransactionsContract,
} from './shared/ipc/contracts/import';
import { listPositionsContract, setInitialBalanceContract } from './shared/ipc/contracts/portfolio';
import { generateAssetsReportContract } from './shared/ipc/contracts/report';
import {
  ipcContracts,
  rendererExposedIpcContracts,
} from './shared/ipc/contracts/ipc-contract-registry';

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

    expect(invoke).toHaveBeenNthCalledWith(1, previewImportTransactionsContract.channel, {
      filePath: '/tmp/operations.csv',
    });
    expect(invoke).toHaveBeenNthCalledWith(2, confirmImportTransactionsContract.channel, {
      filePath: '/tmp/operations.csv',
    });
    expect(invoke).toHaveBeenNthCalledWith(3, setInitialBalanceContract.channel, {
      ticker: 'IVVB11',
      brokerId: 'broker-xp',
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
      year: 2025,
    });
    expect(invoke).toHaveBeenNthCalledWith(4, listPositionsContract.channel, {
      baseYear: 2025,
    });
    expect(invoke).toHaveBeenNthCalledWith(5, generateAssetsReportContract.channel, {
      baseYear: 2025,
    });
  });

  it('does not expose generic IPC surface to renderer', () => {
    const exposedKeys = Object.keys(electronApi).sort();
    expect(exposedKeys).toEqual([
      'appName',
      'confirmImportTransactions',
      'createBroker',
      'deleteAllPositions',
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
    const registeredChannels = new Set(ipcContracts.map((contract) => contract.channel));

    expect(
      rendererExposedIpcContracts.every((contract) => registeredChannels.has(contract.channel)),
    ).toBe(true);
  });
});
