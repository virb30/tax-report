import type {
  GenerateAssetsReportQuery,
  GenerateAssetsReportResult,
} from '@shared/contracts/assets-report.contract';
import type {
  ImportOperationsCommand,
  ImportOperationsResult,
} from '@shared/contracts/import-operations.contract';
import type {
  ListPositionsQuery,
  ListPositionsResult,
} from '@shared/contracts/list-positions.contract';
import type {
  SetInitialBalanceCommand,
  SetInitialBalanceResult,
} from '@shared/contracts/initial-balance.contract';
import type {
  ConfirmImportOperationsCommand,
  ConfirmImportOperationsResult,
  ConfirmImportTransactionsCommand,
  ConfirmImportTransactionsResult,
  PreviewImportFromFileCommand,
  PreviewImportFromFileResult,
  PreviewImportTransactionsCommand,
  PreviewImportTransactionsResult,
} from '@shared/contracts/preview-import.contract';
import type {
  CreateBrokerCommand,
  CreateBrokerResult,
  ListBrokersQuery,
  ListBrokersResult,
  UpdateBrokerCommand,
  UpdateBrokerResult,
  ToggleBrokerActiveCommand,
  ToggleBrokerActiveResult,
} from '@shared/contracts/brokers.contract';
import type {
  RecalculatePositionCommand,
  RecalculatePositionResult,
} from '@shared/contracts/recalculate.contract';
import type {
  MigrateYearCommand,
  MigrateYearResult,
} from '@shared/contracts/migrate-year.contract';
import type {
  ImportConsolidatedPositionCommand,
  ImportConsolidatedPositionResult,
  PreviewConsolidatedPositionCommand,
  PreviewConsolidatedPositionResult,
} from '@shared/contracts/import-consolidated-position.contract';
import type {
  DeletePositionCommand,
  DeletePositionResult,
} from '@shared/contracts/delete-position.contract';

type IpcMainLike = {
  handle: (
    channel: string,
    listener: (_event: unknown, ...args: unknown[]) => unknown,
  ) => void;
};

export type MainHandlersDependencies = {
  checkHealth: () => { status: 'ok' };
  importSelectFile: () => Promise<{ filePath: string | null }>;
  previewImportFromFile: (input: PreviewImportFromFileCommand) => Promise<PreviewImportFromFileResult>;
  previewImportTransactions: (
    input: PreviewImportTransactionsCommand,
  ) => Promise<PreviewImportTransactionsResult>;
  importOperations: (input: ImportOperationsCommand) => Promise<ImportOperationsResult>;
  confirmImportOperations: (
    input: ConfirmImportOperationsCommand,
  ) => Promise<ConfirmImportOperationsResult>;
  confirmImportTransactions: (
    input: ConfirmImportTransactionsCommand,
  ) => Promise<ConfirmImportTransactionsResult>;
  setInitialBalance: (input: SetInitialBalanceCommand) => Promise<SetInitialBalanceResult>;
  listPositions: (input: ListPositionsQuery) => Promise<ListPositionsResult>;
  generateAssetsReport: (
    input: GenerateAssetsReportQuery,
  ) => Promise<GenerateAssetsReportResult>;
  listBrokers: (input?: ListBrokersQuery) => Promise<ListBrokersResult>;
  createBroker: (input: CreateBrokerCommand) => Promise<CreateBrokerResult>;
  updateBroker: (input: UpdateBrokerCommand) => Promise<UpdateBrokerResult>;
  toggleBrokerActive: (input: ToggleBrokerActiveCommand) => Promise<ToggleBrokerActiveResult>;
  recalculatePosition: (input: RecalculatePositionCommand) => Promise<RecalculatePositionResult>;
  migrateYear: (input: MigrateYearCommand) => Promise<MigrateYearResult>;
  previewConsolidatedPosition: (
    input: PreviewConsolidatedPositionCommand,
  ) => Promise<PreviewConsolidatedPositionResult>;
  importConsolidatedPosition: (
    input: ImportConsolidatedPositionCommand,
  ) => Promise<ImportConsolidatedPositionResult>;
  deletePosition: (input: DeletePositionCommand) => Promise<DeletePositionResult>;
};

export function registerMainHandlers(
  ipcMain: IpcMainLike,
  dependencies: MainHandlersDependencies,
): string[] {
  const registeredChannels = [
    'app:health-check',
    'import:select-file',
    'import:preview-file',
    'import:preview-transactions',
    'import:operations',
    'import:confirm-operations',
    'import:confirm-transactions',
    'portfolio:set-initial-balance',
    'portfolio:list-positions',
    'portfolio:recalculate',
    'portfolio:migrate-year',
    'portfolio:preview-consolidated-position',
    'portfolio:import-consolidated-position',
    'portfolio:delete-position',
    'report:assets-annual',
    'brokers:list',
    'brokers:create',
    'brokers:update',
    'brokers:toggle-active',
  ];

  ipcMain.handle('app:health-check', () => {
    return dependencies.checkHealth();
  });

  ipcMain.handle('import:select-file', () => {
    return dependencies.importSelectFile();
  });

  ipcMain.handle('import:preview-file', (_event, input: PreviewImportFromFileCommand) => {
    const payload = parsePreviewImportFromFileInput(input);
    return dependencies.previewImportFromFile(payload);
  });

  ipcMain.handle('import:preview-transactions', (_event, input: PreviewImportTransactionsCommand) => {
    const payload = parsePreviewImportTransactionsInput(input);
    return dependencies.previewImportTransactions(payload);
  });

  ipcMain.handle('import:operations', (_event, input: ImportOperationsCommand) => {
    const payload = parseImportOperationsInput(input);
    return dependencies.importOperations(payload);
  });

  ipcMain.handle('import:confirm-operations', (_event, input: ConfirmImportOperationsCommand) => {
    const payload = parseConfirmImportOperationsInput(input);
    return dependencies.confirmImportOperations(payload);
  });

  ipcMain.handle('import:confirm-transactions', (_event, input: ConfirmImportTransactionsCommand) => {
    const payload = parseConfirmImportTransactionsInput(input);
    return dependencies.confirmImportTransactions(payload);
  });

  ipcMain.handle('portfolio:set-initial-balance', (_event, input: SetInitialBalanceCommand) => {
    const payload = parseSetInitialBalanceInput(input);
    return dependencies.setInitialBalance(payload);
  });

  ipcMain.handle('portfolio:list-positions', (_event, input: ListPositionsQuery) => {
    const payload = parseListPositionsInput(input);
    return dependencies.listPositions(payload);
  });

  ipcMain.handle('portfolio:recalculate', (_event, input: RecalculatePositionCommand) => {
    const payload = parseRecalculatePositionInput(input);
    return dependencies.recalculatePosition(payload);
  });

  ipcMain.handle('portfolio:migrate-year', (_event, input: MigrateYearCommand) => {
    const payload = parseMigrateYearInput(input);
    return dependencies.migrateYear(payload);
  });

  ipcMain.handle(
    'portfolio:preview-consolidated-position',
    (_event, input: PreviewConsolidatedPositionCommand) => {
      const payload = parsePreviewConsolidatedPositionInput(input);
      return dependencies.previewConsolidatedPosition(payload);
    },
  );

  ipcMain.handle(
    'portfolio:import-consolidated-position',
    (_event, input: ImportConsolidatedPositionCommand) => {
      const payload = parseImportConsolidatedPositionInput(input);
      return dependencies.importConsolidatedPosition(payload);
    },
  );

  ipcMain.handle('portfolio:delete-position', (_event, input: DeletePositionCommand) => {
    const payload = parseDeletePositionInput(input);
    return dependencies.deletePosition(payload);
  });

  ipcMain.handle('report:assets-annual', (_event, input: GenerateAssetsReportQuery) => {
    const payload = parseGenerateAssetsReportInput(input);
    return dependencies.generateAssetsReport(payload);
  });

  ipcMain.handle('brokers:list', (_event, input?: ListBrokersQuery) => {
    const payload = parseListBrokersInput(input);
    return dependencies.listBrokers(payload);
  });

  ipcMain.handle('brokers:create', (_event, input: CreateBrokerCommand) => {
    const payload = parseCreateBrokerInput(input);
    return dependencies.createBroker(payload);
  });

  ipcMain.handle('brokers:update', (_event, input: UpdateBrokerCommand) => {
    const payload = parseUpdateBrokerInput(input);
    return dependencies.updateBroker(payload);
  });

  ipcMain.handle('brokers:toggle-active', (_event, input: ToggleBrokerActiveCommand) => {
    const payload = parseToggleBrokerActiveInput(input);
    return dependencies.toggleBrokerActive(payload);
  });

  return registeredChannels;
}

function parsePreviewImportFromFileInput(input: unknown): PreviewImportFromFileCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for import preview.');
  }
  const payload = input as { broker?: unknown; filePath?: unknown };
  if (typeof payload.broker !== 'string' || payload.broker.trim().length === 0) {
    throw new Error('Invalid broker for import preview.');
  }
  if (typeof payload.filePath !== 'string' || payload.filePath.trim().length === 0) {
    throw new Error('Invalid file path for import preview.');
  }
  return {
    broker: payload.broker,
    filePath: payload.filePath,
  };
}

function parseImportOperationsInput(input: unknown): ImportOperationsCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for import operations.');
  }
  const payload = input as {
    tradeDate?: unknown;
    broker?: unknown;
    totalOperationalCosts?: unknown;
    operations?: unknown;
  };
  if (typeof payload.tradeDate !== 'string' || payload.tradeDate.trim().length === 0) {
    throw new Error('Invalid trade date for import operations.');
  }
  if (typeof payload.broker !== 'string' || payload.broker.trim().length === 0) {
    throw new Error('Invalid broker for import operations.');
  }
  if (typeof payload.totalOperationalCosts !== 'number' || Number.isNaN(payload.totalOperationalCosts)) {
    throw new Error('Invalid operational costs for import operations.');
  }
  if (!Array.isArray(payload.operations)) {
    throw new Error('Invalid operations list for import operations.');
  }
  return input as ImportOperationsCommand;
}

function parseConfirmImportOperationsInput(input: unknown): ConfirmImportOperationsCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for confirm import operations.');
  }
  const payload = input as { commands?: unknown };
  if (!Array.isArray(payload.commands)) {
    throw new Error('Invalid commands list for confirm import operations.');
  }
  return input as ConfirmImportOperationsCommand;
}

function parsePreviewImportTransactionsInput(input: unknown): PreviewImportTransactionsCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for preview import transactions.');
  }
  const payload = input as { filePath?: unknown };
  if (typeof payload.filePath !== 'string' || payload.filePath.trim().length === 0) {
    throw new Error('Invalid file path for preview import transactions.');
  }
  return { filePath: payload.filePath };
}

function parseConfirmImportTransactionsInput(
  input: unknown,
): ConfirmImportTransactionsCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for confirm import transactions.');
  }
  const payload = input as { filePath?: unknown };
  if (typeof payload.filePath !== 'string' || payload.filePath.trim().length === 0) {
    throw new Error('Invalid file path for confirm import transactions.');
  }
  return { filePath: payload.filePath };
}

function parseListPositionsInput(input: unknown): ListPositionsQuery {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for list positions.');
  }
  const payload = input as { baseYear?: unknown };
  if (typeof payload.baseYear !== 'number' || !Number.isInteger(payload.baseYear)) {
    throw new Error('Invalid base year for list positions.');
  }
  return { baseYear: payload.baseYear };
}

function parseSetInitialBalanceInput(input: unknown): SetInitialBalanceCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for initial balance.');
  }
  const payload = input as {
    ticker?: unknown;
    brokerId?: unknown;
    assetType?: unknown;
    quantity?: unknown;
    averagePrice?: unknown;
    year?: unknown;
  };
  if (typeof payload.ticker !== 'string' || payload.ticker.trim().length === 0) {
    throw new Error('Invalid ticker for initial balance.');
  }
  if (typeof payload.brokerId !== 'string' || payload.brokerId.trim().length === 0) {
    throw new Error('Invalid broker for initial balance.');
  }
  const validAssetTypes = ['stock', 'fii', 'etf', 'bdr'];
  if (
    typeof payload.assetType !== 'string' ||
    !validAssetTypes.includes(payload.assetType)
  ) {
    throw new Error('Invalid asset type for initial balance.');
  }
  if (typeof payload.quantity !== 'number' || Number.isNaN(payload.quantity)) {
    throw new Error('Invalid quantity for initial balance.');
  }
  if (typeof payload.averagePrice !== 'number' || Number.isNaN(payload.averagePrice)) {
    throw new Error('Invalid average price for initial balance.');
  }
  if (typeof payload.year !== 'number' || !Number.isInteger(payload.year)) {
    throw new Error('Invalid year for initial balance.');
  }
  return {
    ticker: payload.ticker,
    brokerId: payload.brokerId,
    assetType: payload.assetType as SetInitialBalanceCommand['assetType'],
    quantity: payload.quantity,
    averagePrice: payload.averagePrice,
    year: payload.year,
  };
}

function parseGenerateAssetsReportInput(input: unknown): GenerateAssetsReportQuery {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for assets report.');
  }
  const payload = input as { baseYear?: unknown };
  if (typeof payload.baseYear !== 'number' || !Number.isInteger(payload.baseYear)) {
    throw new Error('Invalid base year for assets report.');
  }
  return {
    baseYear: payload.baseYear,
  };
}

function parseRecalculatePositionInput(input: unknown): RecalculatePositionCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for recalculate position.');
  }
  const payload = input as { ticker?: unknown; year?: unknown };
  if (typeof payload.ticker !== 'string' || payload.ticker.trim().length === 0) {
    throw new Error('Invalid ticker for recalculate position.');
  }
  if (typeof payload.year !== 'number' || !Number.isInteger(payload.year)) {
    throw new Error('Invalid year for recalculate position.');
  }
  return {
    ticker: payload.ticker,
    year: payload.year,
  };
}

function parseMigrateYearInput(input: unknown): MigrateYearCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for migrate year.');
  }
  const payload = input as { sourceYear?: unknown; targetYear?: unknown };
  if (typeof payload.sourceYear !== 'number' || !Number.isInteger(payload.sourceYear)) {
    throw new Error('Invalid source year for migrate year.');
  }
  if (typeof payload.targetYear !== 'number' || !Number.isInteger(payload.targetYear)) {
    throw new Error('Invalid target year for migrate year.');
  }
  return {
    sourceYear: payload.sourceYear,
    targetYear: payload.targetYear,
  };
}

function parsePreviewConsolidatedPositionInput(
  input: unknown,
): PreviewConsolidatedPositionCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for preview consolidated position.');
  }
  const payload = input as { filePath?: unknown };
  if (typeof payload.filePath !== 'string' || payload.filePath.trim().length === 0) {
    throw new Error('Invalid file path for preview consolidated position.');
  }
  return { filePath: payload.filePath };
}

function parseImportConsolidatedPositionInput(
  input: unknown,
): ImportConsolidatedPositionCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for import consolidated position.');
  }
  const payload = input as { filePath?: unknown; year?: unknown };
  if (typeof payload.filePath !== 'string' || payload.filePath.trim().length === 0) {
    throw new Error('Invalid file path for import consolidated position.');
  }
  if (typeof payload.year !== 'number' || !Number.isInteger(payload.year)) {
    throw new Error('Invalid year for import consolidated position.');
  }
  return { filePath: payload.filePath, year: payload.year };
}

function parseDeletePositionInput(input: unknown): DeletePositionCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for delete position.');
  }
  const payload = input as { ticker?: unknown; year?: unknown };
  if (typeof payload.ticker !== 'string' || payload.ticker.trim().length === 0) {
    throw new Error('Invalid ticker for delete position.');
  }
  if (typeof payload.year !== 'number' || !Number.isInteger(payload.year)) {
    throw new Error('Invalid year for delete position.');
  }
  return { ticker: payload.ticker, year: payload.year };
}

function parseListBrokersInput(input: unknown): ListBrokersQuery | undefined {
  if (input === undefined || input === null) {
    return undefined;
  }
  if (typeof input !== 'object') {
    return undefined;
  }
  const payload = input as { activeOnly?: unknown };
  if (typeof payload.activeOnly === 'boolean') {
    return { activeOnly: payload.activeOnly };
  }
  return undefined;
}

function parseCreateBrokerInput(input: unknown): CreateBrokerCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for create broker.');
  }
  const payload = input as { name?: unknown; cnpj?: unknown; codigo?: unknown; code?: unknown };
  if (typeof payload.name !== 'string') {
    throw new Error('Invalid name for create broker.');
  }
  if (typeof payload.cnpj !== 'string') {
    throw new Error('Invalid CNPJ for create broker.');
  }
  const codeValue = payload.code ?? payload.codigo;
  if (typeof codeValue !== 'string') {
    throw new Error('Invalid code for create broker.');
  }
  return {
    name: payload.name,
    cnpj: payload.cnpj,
    code: codeValue,
  };
}

function parseUpdateBrokerInput(input: unknown): UpdateBrokerCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for update broker.');
  }
  const payload = input as { id?: unknown; name?: unknown; cnpj?: unknown; code?: unknown };
  if (typeof payload.id !== 'string' || payload.id.trim().length === 0) {
    throw new Error('Invalid id for update broker.');
  }
  return {
    id: payload.id,
    ...(typeof payload.name === 'string' && { name: payload.name }),
    ...(typeof payload.cnpj === 'string' && { cnpj: payload.cnpj }),
    ...(typeof payload.code === 'string' && { code: payload.code }),
  };
}

function parseToggleBrokerActiveInput(input: unknown): ToggleBrokerActiveCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for toggle broker active.');
  }
  const payload = input as { id?: unknown };
  if (typeof payload.id !== 'string' || payload.id.trim().length === 0) {
    throw new Error('Invalid id for toggle broker active.');
  }
  return { id: payload.id };
}
