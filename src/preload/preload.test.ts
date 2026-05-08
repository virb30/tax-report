import { listAssetsContract, repairAssetTypeContract, updateAssetContract } from '../ipc/public';
import {
  confirmImportTransactionsContract,
  deleteDailyBrokerTaxContract,
  importDailyBrokerTaxesContract,
  listDailyBrokerTaxesContract,
  previewImportTransactionsContract,
  saveDailyBrokerTaxContract,
} from '../ipc/public';
import {
  deleteInitialBalanceDocumentContract,
  listInitialBalanceDocumentsContract,
  listPositionsContract,
  saveInitialBalanceDocumentContract,
} from '../ipc/public';
import { generateAssetsReportContract } from '../ipc/public';
import {
  monthlyTaxDetailContract,
  monthlyTaxHistoryContract,
  recalculateMonthlyTaxHistoryContract,
} from '../ipc/public';
import { ipcContracts, rendererExposedIpcContracts } from '../ipc/public';

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
import { AssetType } from '../ipc/public';

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
    await electronApi.listDailyBrokerTaxes();
    await electronApi.saveDailyBrokerTax({
      date: '2025-04-01',
      brokerId: 'broker-xp',
      fees: 1.23,
      irrf: 0.01,
    });
    await electronApi.importDailyBrokerTaxes({
      filePath: '/tmp/daily-broker-taxes.csv',
    });
    await electronApi.deleteDailyBrokerTax({
      date: '2025-04-01',
      brokerId: 'broker-xp',
    });
    await electronApi.saveInitialBalanceDocument({
      ticker: 'IVVB11',
      year: 2025,
      assetType: AssetType.Etf,
      name: 'iShares Core S&P 500',
      cnpj: '11.111.111/0001-11',
      averagePrice: '300',
      allocations: [{ brokerId: 'broker-xp', quantity: '2' }],
    });
    await electronApi.listInitialBalanceDocuments({ year: 2025 });
    await electronApi.deleteInitialBalanceDocument({ ticker: 'IVVB11', year: 2025 });
    await electronApi.listPositions({ baseYear: 2025 });
    await electronApi.generateAssetsReport({ baseYear: 2025 });
    await electronApi.listMonthlyTaxHistory();
    await electronApi.getMonthlyTaxDetail({ month: '2025-04' });
    await electronApi.recalculateMonthlyTaxHistory({ startYear: 2025, reason: 'manual' });
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
    expect(invoke).toHaveBeenNthCalledWith(3, listDailyBrokerTaxesContract.channel);
    expect(invoke).toHaveBeenNthCalledWith(4, saveDailyBrokerTaxContract.channel, {
      date: '2025-04-01',
      brokerId: 'broker-xp',
      fees: 1.23,
      irrf: 0.01,
    });
    expect(invoke).toHaveBeenNthCalledWith(5, importDailyBrokerTaxesContract.channel, {
      filePath: '/tmp/daily-broker-taxes.csv',
    });
    expect(invoke).toHaveBeenNthCalledWith(6, deleteDailyBrokerTaxContract.channel, {
      date: '2025-04-01',
      brokerId: 'broker-xp',
    });
    expect(invoke).toHaveBeenNthCalledWith(7, saveInitialBalanceDocumentContract.channel, {
      ticker: 'IVVB11',
      year: 2025,
      assetType: AssetType.Etf,
      name: 'iShares Core S&P 500',
      cnpj: '11.111.111/0001-11',
      averagePrice: '300',
      allocations: [{ brokerId: 'broker-xp', quantity: '2' }],
    });
    expect(invoke).toHaveBeenNthCalledWith(8, listInitialBalanceDocumentsContract.channel, {
      year: 2025,
    });
    expect(invoke).toHaveBeenNthCalledWith(9, deleteInitialBalanceDocumentContract.channel, {
      ticker: 'IVVB11',
      year: 2025,
    });
    expect(invoke).toHaveBeenNthCalledWith(10, listPositionsContract.channel, {
      baseYear: 2025,
    });
    expect(invoke).toHaveBeenNthCalledWith(11, generateAssetsReportContract.channel, {
      baseYear: 2025,
    });
    expect(invoke).toHaveBeenNthCalledWith(12, monthlyTaxHistoryContract.channel);
    expect(invoke).toHaveBeenNthCalledWith(13, monthlyTaxDetailContract.channel, {
      month: '2025-04',
    });
    expect(invoke).toHaveBeenNthCalledWith(14, recalculateMonthlyTaxHistoryContract.channel, {
      startYear: 2025,
      reason: 'manual',
    });
    expect(invoke).toHaveBeenNthCalledWith(15, listAssetsContract.channel, {
      pendingOnly: true,
    });
    expect(invoke).toHaveBeenNthCalledWith(16, updateAssetContract.channel, {
      ticker: 'IVVB11',
      assetType: AssetType.Etf,
      name: 'iShares Core S&P 500',
    });
    expect(invoke).toHaveBeenNthCalledWith(17, repairAssetTypeContract.channel, {
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
      'deleteDailyBrokerTax',
      'deleteInitialBalanceDocument',
      'deletePosition',
      'generateAssetsReport',
      'getMonthlyTaxDetail',
      'importConsolidatedPosition',
      'importDailyBrokerTaxes',
      'importSelectFile',
      'listAssets',
      'listBrokers',
      'listDailyBrokerTaxes',
      'listInitialBalanceDocuments',
      'listMonthlyTaxHistory',
      'listPositions',
      'migrateYear',
      'previewConsolidatedPosition',
      'previewImportTransactions',
      'recalculateMonthlyTaxHistory',
      'recalculatePosition',
      'repairAssetType',
      'saveDailyBrokerTax',
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
