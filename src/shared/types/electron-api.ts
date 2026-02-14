import type {
  GenerateAssetsReportQuery,
  GenerateAssetsReportResult,
} from '../contracts/assets-report.contract';
import type {
  ImportOperationsCommand,
  ImportOperationsResult,
} from '../contracts/import-operations.contract';
import type {
  ListPositionsQuery,
  ListPositionsResult,
} from '../contracts/list-positions.contract';
import type {
  SetInitialBalanceCommand,
  SetInitialBalanceResult,
} from '../contracts/initial-balance.contract';
import type {
  CreateBrokerCommand,
  CreateBrokerResult,
  ListBrokersResult,
} from '../contracts/brokers.contract';
import type {
  RecalculatePositionCommand,
  RecalculatePositionResult,
} from '../contracts/recalculate.contract';
import type {
  MigrateYearCommand,
  MigrateYearResult,
} from '../contracts/migrate-year.contract';
import type {
  ImportConsolidatedPositionCommand,
  ImportConsolidatedPositionResult,
  PreviewConsolidatedPositionCommand,
  PreviewConsolidatedPositionResult,
} from '../contracts/import-consolidated-position.contract';
import type {
  DeletePositionCommand,
  DeletePositionResult,
} from '../contracts/delete-position.contract';
import type {
  ConfirmImportOperationsCommand,
  ConfirmImportOperationsResult,
  ConfirmImportTransactionsCommand,
  ConfirmImportTransactionsResult,
  PreviewImportFromFileCommand,
  PreviewImportFromFileResult,
  PreviewImportTransactionsCommand,
  PreviewImportTransactionsResult,
} from '../contracts/preview-import.contract';

export type ElectronApi = {
  appName: string;
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
  listBrokers: () => Promise<ListBrokersResult>;
  createBroker: (input: CreateBrokerCommand) => Promise<CreateBrokerResult>;
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
