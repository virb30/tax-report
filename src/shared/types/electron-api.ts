import type {
  GenerateAssetsReportQuery,
  GenerateAssetsReportResult,
} from '../contracts/assets-report.contract';
import type {
  ImportOperationsCommand,
  ImportOperationsResult,
} from '../contracts/import-operations.contract';
import type { ListPositionsResult } from '../contracts/list-positions.contract';
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
  ConfirmImportOperationsCommand,
  ConfirmImportOperationsResult,
  PreviewImportFromFileCommand,
  PreviewImportFromFileResult,
} from '../contracts/preview-import.contract';

export type ElectronApi = {
  appName: string;
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
