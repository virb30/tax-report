import type {
  GenerateAssetsReportQuery,
  GenerateAssetsReportResult,
} from '@shared/contracts/assets-report.contract';
import type {
  ImportOperationsCommand,
  ImportOperationsResult,
} from '@shared/contracts/import-operations.contract';
import type { ListPositionsResult } from '@shared/contracts/list-positions.contract';
import type {
  SetInitialBalanceCommand,
  SetInitialBalanceResult,
} from '@shared/contracts/initial-balance.contract';
import type {
  ConfirmImportOperationsCommand,
  ConfirmImportOperationsResult,
  PreviewImportFromFileCommand,
  PreviewImportFromFileResult,
} from '@shared/contracts/preview-import.contract';
import type {
  CreateBrokerCommand,
  CreateBrokerResult,
  ListBrokersResult,
} from '@shared/contracts/brokers.contract';

type IpcMainLike = {
  handle: (
    channel: string,
    listener: (_event: unknown, ...args: unknown[]) => unknown,
  ) => void;
};

export type MainHandlersDependencies = {
  checkHealth: () => { status: 'ok' };
  previewImportFromFile: (input: PreviewImportFromFileCommand) => Promise<PreviewImportFromFileResult>;
  importOperations: (input: ImportOperationsCommand) => Promise<ImportOperationsResult>;
  confirmImportOperations: (
    input: ConfirmImportOperationsCommand,
  ) => Promise<ConfirmImportOperationsResult>;
  setInitialBalance: (input: SetInitialBalanceCommand) => Promise<SetInitialBalanceResult>;
  listPositions: () => Promise<ListPositionsResult>;
  generateAssetsReport: (
    input: GenerateAssetsReportQuery,
  ) => Promise<GenerateAssetsReportResult>;
  listBrokers: () => Promise<ListBrokersResult>;
  createBroker: (input: CreateBrokerCommand) => Promise<CreateBrokerResult>;
};

export function registerMainHandlers(
  ipcMain: IpcMainLike,
  dependencies: MainHandlersDependencies,
): string[] {
  const registeredChannels = [
    'app:health-check',
    'import:preview-file',
    'import:operations',
    'import:confirm-operations',
    'portfolio:set-initial-balance',
    'portfolio:list-positions',
    'report:assets-annual',
    'brokers:list',
    'brokers:create',
  ];

  ipcMain.handle('app:health-check', () => {
    return dependencies.checkHealth();
  });

  ipcMain.handle('import:preview-file', (_event, input: PreviewImportFromFileCommand) => {
    const payload = parsePreviewImportFromFileInput(input);
    return dependencies.previewImportFromFile(payload);
  });

  ipcMain.handle('import:operations', (_event, input: ImportOperationsCommand) => {
    const payload = parseImportOperationsInput(input);
    return dependencies.importOperations(payload);
  });

  ipcMain.handle('import:confirm-operations', (_event, input: ConfirmImportOperationsCommand) => {
    const payload = parseConfirmImportOperationsInput(input);
    return dependencies.confirmImportOperations(payload);
  });

  ipcMain.handle('portfolio:set-initial-balance', (_event, input: SetInitialBalanceCommand) => {
    const payload = parseSetInitialBalanceInput(input);
    return dependencies.setInitialBalance(payload);
  });

  ipcMain.handle('portfolio:list-positions', () => {
    return dependencies.listPositions();
  });

  ipcMain.handle('report:assets-annual', (_event, input: GenerateAssetsReportQuery) => {
    const payload = parseGenerateAssetsReportInput(input);
    return dependencies.generateAssetsReport(payload);
  });

  ipcMain.handle('brokers:list', () => {
    return dependencies.listBrokers();
  });

  ipcMain.handle('brokers:create', (_event, input: CreateBrokerCommand) => {
    const payload = parseCreateBrokerInput(input);
    return dependencies.createBroker(payload);
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
  return {
    ticker: payload.ticker,
    brokerId: payload.brokerId,
    assetType: payload.assetType as SetInitialBalanceCommand['assetType'],
    quantity: payload.quantity,
    averagePrice: payload.averagePrice,
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

function parseCreateBrokerInput(input: unknown): CreateBrokerCommand {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payload for create broker.');
  }
  const payload = input as { name?: unknown; cnpj?: unknown };
  if (typeof payload.name !== 'string') {
    throw new Error('Invalid name for create broker.');
  }
  if (typeof payload.cnpj !== 'string') {
    throw new Error('Invalid CNPJ for create broker.');
  }
  return {
    name: payload.name,
    cnpj: payload.cnpj,
  };
}
