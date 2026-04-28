import type {
  GenerateAssetsReportQuery,
  GenerateAssetsReportResult,
} from '../contracts/assets-report.contract';
import type { ListPositionsQuery, ListPositionsResult } from '../contracts/list-positions.contract';
import type {
  SetInitialBalanceCommand,
  SetInitialBalanceResult,
} from '../contracts/initial-balance.contract';
import type {
  CreateBrokerCommand,
  CreateBrokerResult,
  ListBrokersQuery,
  ListBrokersResult,
  UpdateBrokerCommand,
  UpdateBrokerResult,
  ToggleBrokerActiveCommand,
  ToggleBrokerActiveResult,
} from '../contracts/brokers.contract';
import type {
  RecalculatePositionCommand,
  RecalculatePositionResult,
} from '../contracts/recalculate.contract';
import type { MigrateYearCommand, MigrateYearResult } from '../contracts/migrate-year.contract';
import type {
  ImportConsolidatedPositionCommand,
  ImportConsolidatedPositionResult,
  PreviewConsolidatedPositionCommand,
  PreviewConsolidatedPositionResult,
} from '../contracts/import-consolidated-position.contract';
import type {
  DeleteAllPositionsCommand,
  DeleteAllPositionsResult,
  DeletePositionCommand,
  DeletePositionResult,
} from '../contracts/delete-position.contract';
import type {
  ConfirmImportTransactionsCommand,
  ConfirmImportTransactionsResult,
  PreviewImportTransactionsCommand,
  PreviewImportTransactionsResult,
} from '../contracts/preview-import.contract';

export type ElectronApi = {
  appName: string;
  importSelectFile: () => Promise<{ filePath: string | null }>;
  previewImportTransactions: (
    input: PreviewImportTransactionsCommand,
  ) => Promise<PreviewImportTransactionsResult>;
  confirmImportTransactions: (
    input: ConfirmImportTransactionsCommand,
  ) => Promise<ConfirmImportTransactionsResult>;
  setInitialBalance: (input: SetInitialBalanceCommand) => Promise<SetInitialBalanceResult>;
  listPositions: (input: ListPositionsQuery) => Promise<ListPositionsResult>;
  generateAssetsReport: (input: GenerateAssetsReportQuery) => Promise<GenerateAssetsReportResult>;
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
  deleteAllPositions: (input: DeleteAllPositionsCommand) => Promise<DeleteAllPositionsResult>;
};
