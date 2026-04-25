import { healthCheckContract } from './contracts/app';
import {
  createBrokerContract,
  listBrokersContract,
  toggleBrokerActiveContract,
  updateBrokerContract,
} from './contracts/brokers';
import {
  confirmImportTransactionsContract,
  importSelectFileContract,
  previewImportTransactionsContract,
} from './contracts/import';
import {
  deletePositionContract,
  importConsolidatedPositionContract,
  listPositionsContract,
  migrateYearContract,
  previewConsolidatedPositionContract,
  recalculatePositionContract,
  setInitialBalanceContract,
} from './contracts/portfolio';
import { generateAssetsReportContract } from './contracts/report';
import { ipcContracts } from './contracts/ipc-contract-registry';

export const APP_IPC_CHANNELS = {
  healthCheck: healthCheckContract.channel,
} as const;

export const IMPORT_IPC_CHANNELS = {
  selectFile: importSelectFileContract.channel,
  previewTransactions: previewImportTransactionsContract.channel,
  confirmTransactions: confirmImportTransactionsContract.channel,
} as const;

export const PORTFOLIO_IPC_CHANNELS = {
  setInitialBalance: setInitialBalanceContract.channel,
  listPositions: listPositionsContract.channel,
  recalculate: recalculatePositionContract.channel,
  migrateYear: migrateYearContract.channel,
  previewConsolidatedPosition: previewConsolidatedPositionContract.channel,
  importConsolidatedPosition: importConsolidatedPositionContract.channel,
  deletePosition: deletePositionContract.channel,
} as const;

export const REPORT_IPC_CHANNELS = {
  assetsAnnual: generateAssetsReportContract.channel,
} as const;

export const BROKERS_IPC_CHANNELS = {
  list: listBrokersContract.channel,
  create: createBrokerContract.channel,
  update: updateBrokerContract.channel,
  toggleActive: toggleBrokerActiveContract.channel,
} as const;

export const REGISTERED_IPC_CHANNELS = ipcContracts.map((contract) => contract.channel);

export const ELECTRON_API_CHANNELS = {
  importSelectFile: importSelectFileContract.channel,
  previewImportTransactions: previewImportTransactionsContract.channel,
  confirmImportTransactions: confirmImportTransactionsContract.channel,
  setInitialBalance: setInitialBalanceContract.channel,
  listPositions: listPositionsContract.channel,
  generateAssetsReport: generateAssetsReportContract.channel,
  listBrokers: listBrokersContract.channel,
  createBroker: createBrokerContract.channel,
  updateBroker: updateBrokerContract.channel,
  toggleBrokerActive: toggleBrokerActiveContract.channel,
  recalculatePosition: recalculatePositionContract.channel,
  migrateYear: migrateYearContract.channel,
  previewConsolidatedPosition: previewConsolidatedPositionContract.channel,
  importConsolidatedPosition: importConsolidatedPositionContract.channel,
  deletePosition: deletePositionContract.channel,
} as const;
