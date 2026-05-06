/* istanbul ignore file */
export type { ElectronApi } from '../renderer/electron-api';
export { buildElectronApi } from '../renderer/build-electron-api';
export {
  assertUniqueIpcContractMetadata,
  ipcContracts,
  rendererExposedIpcContracts,
} from '../renderer/ipc-contract-registry';
export { ELECTRON_API_CHANNELS, REGISTERED_IPC_CHANNELS } from '../renderer/ipc-channels';
export type { IpcErrorKind, IpcResult, IpcResultError } from '../ipc-result';
export { ipcFailure, ipcSuccess } from '../ipc-result';
export * from '../contracts/domain';
export * from '../contracts/app';
export * from '../contracts/ingestion/daily-broker-tax.contract';
export * from '../contracts/ingestion/import';
export * from '../contracts/ingestion/import-consolidated-position.contract';
export * from '../contracts/ingestion/import-preview-review.contract';
export * from '../contracts/ingestion/import-transactions.contract';
export * from '../contracts/ingestion/preview-import.contract';
export * from '../contracts/portfolio/assets';
export * from '../contracts/portfolio/assets.contract';
export * from '../contracts/portfolio/brokers';
export * from '../contracts/portfolio/brokers.contract';
export * from '../contracts/portfolio/delete-position.contract';
export * from '../contracts/portfolio/initial-balance.contract';
export * from '../contracts/portfolio/list-positions.contract';
export * from '../contracts/portfolio/migrate-year.contract';
export * from '../contracts/portfolio/portfolio';
export * from '../contracts/portfolio/recalculate.contract';
export * from '../contracts/tax-reporting/assets-report.contract';
export * from '../contracts/tax-reporting/report';
