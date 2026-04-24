export const APP_IPC_CHANNELS = {
  healthCheck: 'app:health-check',
} as const;

export const IMPORT_IPC_CHANNELS = {
  selectFile: 'import:select-file',
  previewTransactions: 'import:preview-transactions',
  confirmTransactions: 'import:confirm-transactions',
} as const;

export const PORTFOLIO_IPC_CHANNELS = {
  setInitialBalance: 'portfolio:set-initial-balance',
  listPositions: 'portfolio:list-positions',
  recalculate: 'portfolio:recalculate',
  migrateYear: 'portfolio:migrate-year',
  previewConsolidatedPosition: 'portfolio:preview-consolidated-position',
  importConsolidatedPosition: 'portfolio:import-consolidated-position',
  deletePosition: 'portfolio:delete-position',
} as const;

export const REPORT_IPC_CHANNELS = {
  assetsAnnual: 'report:assets-annual',
} as const;

export const BROKERS_IPC_CHANNELS = {
  list: 'brokers:list',
  create: 'brokers:create',
  update: 'brokers:update',
  toggleActive: 'brokers:toggle-active',
} as const;

export const REGISTERED_IPC_CHANNELS = [
  ...Object.values(APP_IPC_CHANNELS),
  ...Object.values(IMPORT_IPC_CHANNELS),
  ...Object.values(PORTFOLIO_IPC_CHANNELS),
  ...Object.values(REPORT_IPC_CHANNELS),
  ...Object.values(BROKERS_IPC_CHANNELS),
];

export const ELECTRON_API_CHANNELS = {
  importSelectFile: IMPORT_IPC_CHANNELS.selectFile,
  previewImportTransactions: IMPORT_IPC_CHANNELS.previewTransactions,
  confirmImportTransactions: IMPORT_IPC_CHANNELS.confirmTransactions,
  setInitialBalance: PORTFOLIO_IPC_CHANNELS.setInitialBalance,
  listPositions: PORTFOLIO_IPC_CHANNELS.listPositions,
  generateAssetsReport: REPORT_IPC_CHANNELS.assetsAnnual,
  listBrokers: BROKERS_IPC_CHANNELS.list,
  createBroker: BROKERS_IPC_CHANNELS.create,
  updateBroker: BROKERS_IPC_CHANNELS.update,
  toggleBrokerActive: BROKERS_IPC_CHANNELS.toggleActive,
  recalculatePosition: PORTFOLIO_IPC_CHANNELS.recalculate,
  migrateYear: PORTFOLIO_IPC_CHANNELS.migrateYear,
  previewConsolidatedPosition: PORTFOLIO_IPC_CHANNELS.previewConsolidatedPosition,
  importConsolidatedPosition: PORTFOLIO_IPC_CHANNELS.importConsolidatedPosition,
  deletePosition: PORTFOLIO_IPC_CHANNELS.deletePosition,
} as const;
