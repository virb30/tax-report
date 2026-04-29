import { listAssetsContract, updateAssetContract } from './contracts/assets/contracts';
import {
  createBrokerContract,
  listBrokersContract,
  toggleBrokerActiveContract,
  updateBrokerContract,
} from './contracts/brokers/contracts';
import {
  confirmImportTransactionsContract,
  importSelectFileContract,
  previewImportTransactionsContract,
} from './contracts/import/contracts';
import {
  deleteAllPositionsContract,
  deletePositionContract,
  importConsolidatedPositionContract,
  listPositionsContract,
  migrateYearContract,
  previewConsolidatedPositionContract,
  recalculatePositionContract,
  setInitialBalanceContract,
} from './contracts/portfolio/contracts';
import { generateAssetsReportContract } from './contracts/report/contracts';
import { ipcContracts } from './contracts/ipc-contract-registry';

export const REGISTERED_IPC_CHANNELS = ipcContracts.map((contract) => contract.channel);

export const ELECTRON_API_CHANNELS = {
  importSelectFile: importSelectFileContract.channel,
  previewImportTransactions: previewImportTransactionsContract.channel,
  confirmImportTransactions: confirmImportTransactionsContract.channel,
  setInitialBalance: setInitialBalanceContract.channel,
  listPositions: listPositionsContract.channel,
  generateAssetsReport: generateAssetsReportContract.channel,
  listAssets: listAssetsContract.channel,
  updateAsset: updateAssetContract.channel,
  listBrokers: listBrokersContract.channel,
  createBroker: createBrokerContract.channel,
  updateBroker: updateBrokerContract.channel,
  toggleBrokerActive: toggleBrokerActiveContract.channel,
  recalculatePosition: recalculatePositionContract.channel,
  migrateYear: migrateYearContract.channel,
  previewConsolidatedPosition: previewConsolidatedPositionContract.channel,
  importConsolidatedPosition: importConsolidatedPositionContract.channel,
  deletePosition: deletePositionContract.channel,
  deleteAllPositions: deleteAllPositionsContract.channel,
} as const;
