import {
  listAssetsContract,
  repairAssetTypeContract,
  updateAssetContract,
} from './shared/ipc/contracts/assets';
import {
  confirmImportTransactionsContract,
  previewImportTransactionsContract,
} from './shared/ipc/contracts/import';
import {
  deleteInitialBalanceDocumentContract,
  listInitialBalanceDocumentsContract,
  listPositionsContract,
  saveInitialBalanceDocumentContract,
} from './shared/ipc/contracts/portfolio';
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
      assetTypeOverrides: [],
    });
    await electronApi.saveInitialBalanceDocument({
      ticker: 'IVVB11',
      year: 2025,
      assetType: AssetType.Etf,
      averagePrice: 300,
      allocations: [{ brokerId: 'broker-xp', quantity: 2 }],
    });
    await electronApi.listInitialBalanceDocuments({ year: 2025 });
    await electronApi.deleteInitialBalanceDocument({ ticker: 'IVVB11', year: 2025 });
    await electronApi.listPositions({ baseYear: 2025 });
    await electronApi.generateAssetsReport({ baseYear: 2025 });
    await electronApi.listAssets({ pendingOnly: true });
    await electronApi.updateAsset({
      ticker: 'IVVB11',
      assetType: AssetType.Etf,
      name: 'iShares Core S&P 500',
    });
    await electronApi.repairAssetType({
      ticker: 'IVVB11',
      assetType: AssetType.Etf,
    });

    expect(invoke).toHaveBeenNthCalledWith(1, previewImportTransactionsContract.channel, {
      filePath: '/tmp/operations.csv',
    });
    expect(invoke).toHaveBeenNthCalledWith(2, confirmImportTransactionsContract.channel, {
      filePath: '/tmp/operations.csv',
      assetTypeOverrides: [],
    });
    expect(invoke).toHaveBeenNthCalledWith(3, saveInitialBalanceDocumentContract.channel, {
      ticker: 'IVVB11',
      year: 2025,
      assetType: AssetType.Etf,
      averagePrice: 300,
      allocations: [{ brokerId: 'broker-xp', quantity: 2 }],
    });
    expect(invoke).toHaveBeenNthCalledWith(4, listInitialBalanceDocumentsContract.channel, {
      year: 2025,
    });
    expect(invoke).toHaveBeenNthCalledWith(5, deleteInitialBalanceDocumentContract.channel, {
      ticker: 'IVVB11',
      year: 2025,
    });
    expect(invoke).toHaveBeenNthCalledWith(6, listPositionsContract.channel, {
      baseYear: 2025,
    });
    expect(invoke).toHaveBeenNthCalledWith(7, generateAssetsReportContract.channel, {
      baseYear: 2025,
    });
    expect(invoke).toHaveBeenNthCalledWith(8, listAssetsContract.channel, {
      pendingOnly: true,
    });
    expect(invoke).toHaveBeenNthCalledWith(9, updateAssetContract.channel, {
      ticker: 'IVVB11',
      assetType: AssetType.Etf,
      name: 'iShares Core S&P 500',
    });
    expect(invoke).toHaveBeenNthCalledWith(10, repairAssetTypeContract.channel, {
      ticker: 'IVVB11',
      assetType: AssetType.Etf,
    });
  });

  it('does not expose generic IPC surface to renderer', () => {
    const exposedKeys = Object.keys(electronApi).sort();
    expect(exposedKeys).toEqual([
      'appName',
      'confirmImportTransactions',
      'createBroker',
      'deleteAllPositions',
      'deleteInitialBalanceDocument',
      'deletePosition',
      'generateAssetsReport',
      'importConsolidatedPosition',
      'importSelectFile',
      'listAssets',
      'listBrokers',
      'listInitialBalanceDocuments',
      'listPositions',
      'migrateYear',
      'previewConsolidatedPosition',
      'previewImportTransactions',
      'recalculatePosition',
      'repairAssetType',
      'saveInitialBalanceDocument',
      'toggleBrokerActive',
      'updateAsset',
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
