import type {
  GenerateAssetsReportQuery,
  GenerateAssetsReportResult,
} from '../contracts/assets-report.contract';
import type {
  ImportOperationsCommand,
  ImportOperationsResult,
} from '../contracts/import-operations.contract';
import type { ListPositionsResult } from '../contracts/list-positions.contract';
import type { SetManualBaseCommand, SetManualBaseResult } from '../contracts/manual-base.contract';

export type ElectronApi = {
  appName: string;
  importOperations?: (input: ImportOperationsCommand) => Promise<ImportOperationsResult>;
  setManualBase?: (input: SetManualBaseCommand) => Promise<SetManualBaseResult>;
  listPositions?: () => Promise<ListPositionsResult>;
  generateAssetsReport?: (
    input: GenerateAssetsReportQuery,
  ) => Promise<GenerateAssetsReportResult>;
};
