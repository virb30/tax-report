import {
  listAssetsContract,
  repairAssetTypeContract,
  updateAssetContract,
} from './contracts/assets/contracts';
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
  deleteInitialBalanceDocumentContract,
  deleteAllPositionsContract,
  deletePositionContract,
  importConsolidatedPositionContract,
  listInitialBalanceDocumentsContract,
  listPositionsContract,
  migrateYearContract,
  previewConsolidatedPositionContract,
  recalculatePositionContract,
  saveInitialBalanceDocumentContract,
} from './contracts/portfolio/contracts';
import { generateAssetsReportContract } from './contracts/report/contracts';
import { ipcContracts } from './contracts/ipc-contract-registry';

export const REGISTERED_IPC_CHANNELS = ipcContracts.map((contract) => contract.channel);

export const ELECTRON_API_CHANNELS = {
  importSelectFile: importSelectFileContract.channel,
  previewImportTransactions: previewImportTransactionsContract.channel,
  confirmImportTransactions: confirmImportTransactionsContract.channel,
  saveInitialBalanceDocument: saveInitialBalanceDocumentContract.channel,
  listInitialBalanceDocuments: listInitialBalanceDocumentsContract.channel,
  deleteInitialBalanceDocument: deleteInitialBalanceDocumentContract.channel,
  listPositions: listPositionsContract.channel,
  generateAssetsReport: generateAssetsReportContract.channel,
  listAssets: listAssetsContract.channel,
  updateAsset: updateAssetContract.channel,
  repairAssetType: repairAssetTypeContract.channel,
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
