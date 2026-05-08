import {
  listAssetsContract,
  repairAssetTypeContract,
  updateAssetContract,
} from '../contracts/portfolio/assets/contracts';
import {
  createBrokerContract,
  listBrokersContract,
  toggleBrokerActiveContract,
  updateBrokerContract,
} from '../contracts/portfolio/brokers/contracts';
import {
  confirmImportTransactionsContract,
  deleteDailyBrokerTaxContract,
  importDailyBrokerTaxesContract,
  importSelectFileContract,
  listDailyBrokerTaxesContract,
  previewImportTransactionsContract,
  saveDailyBrokerTaxContract,
} from '../contracts/ingestion/import/contracts';
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
} from '../contracts/portfolio/portfolio/contracts';
import {
  monthlyTaxDetailContract,
  monthlyTaxHistoryContract,
  recalculateMonthlyTaxHistoryContract,
} from '../contracts/tax-reporting/monthly-close/contracts';
import { generateAssetsReportContract } from '../contracts/tax-reporting/report/contracts';
import { ipcContracts } from './ipc-contract-registry';

export const REGISTERED_IPC_CHANNELS = ipcContracts.map((contract) => contract.channel);

export const ELECTRON_API_CHANNELS = {
  importSelectFile: importSelectFileContract.channel,
  previewImportTransactions: previewImportTransactionsContract.channel,
  confirmImportTransactions: confirmImportTransactionsContract.channel,
  listDailyBrokerTaxes: listDailyBrokerTaxesContract.channel,
  saveDailyBrokerTax: saveDailyBrokerTaxContract.channel,
  importDailyBrokerTaxes: importDailyBrokerTaxesContract.channel,
  deleteDailyBrokerTax: deleteDailyBrokerTaxContract.channel,
  saveInitialBalanceDocument: saveInitialBalanceDocumentContract.channel,
  listInitialBalanceDocuments: listInitialBalanceDocumentsContract.channel,
  deleteInitialBalanceDocument: deleteInitialBalanceDocumentContract.channel,
  listPositions: listPositionsContract.channel,
  generateAssetsReport: generateAssetsReportContract.channel,
  listMonthlyTaxHistory: monthlyTaxHistoryContract.channel,
  getMonthlyTaxDetail: monthlyTaxDetailContract.channel,
  recalculateMonthlyTaxHistory: recalculateMonthlyTaxHistoryContract.channel,
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
