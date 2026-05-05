import type {
  ListAssetsQuery,
  ListAssetsResult,
  RepairAssetTypeCommand,
  RepairAssetTypeResult,
  UpdateAssetCommand,
  UpdateAssetResult,
} from '../contracts/portfolio/assets.contract';
import type {
  GenerateAssetsReportQuery,
  GenerateAssetsReportResult,
} from '../contracts/tax-reporting/assets-report.contract';
import type {
  GenerateCapitalGainsAssessmentQuery,
  GenerateCapitalGainsAssessmentResult,
} from '../contracts/tax-reporting/capital-gains-assessment.contract';
import type {
  ListPositionsQuery,
  ListPositionsResult,
} from '../contracts/portfolio/list-positions.contract';
import type {
  DeleteInitialBalanceDocumentCommand,
  DeleteInitialBalanceDocumentResult,
  ListInitialBalanceDocumentsQuery,
  ListInitialBalanceDocumentsResult,
  SaveInitialBalanceDocumentCommand,
  SaveInitialBalanceDocumentResult,
} from '../contracts/portfolio/initial-balance.contract';
import type {
  CreateBrokerCommand,
  CreateBrokerResult,
  ListBrokersQuery,
  ListBrokersResult,
  UpdateBrokerCommand,
  UpdateBrokerResult,
  ToggleBrokerActiveCommand,
  ToggleBrokerActiveResult,
} from '../contracts/portfolio/brokers.contract';
import type {
  RecalculatePositionCommand,
  RecalculatePositionResult,
} from '../contracts/portfolio/recalculate.contract';
import type {
  MigrateYearCommand,
  MigrateYearResult,
} from '../contracts/portfolio/migrate-year.contract';
import type {
  ImportConsolidatedPositionCommand,
  ImportConsolidatedPositionResult,
  PreviewConsolidatedPositionCommand,
  PreviewConsolidatedPositionResult,
} from '../contracts/ingestion/import-consolidated-position.contract';
import type {
  DeleteAllPositionsCommand,
  DeleteAllPositionsResult,
  DeletePositionCommand,
  DeletePositionResult,
} from '../contracts/portfolio/delete-position.contract';
import type {
  ConfirmImportTransactionsCommand,
  ConfirmImportTransactionsResult,
  PreviewImportTransactionsCommand,
  PreviewImportTransactionsResult,
} from '../contracts/ingestion/preview-import.contract';
import type {
  DeleteDailyBrokerTaxCommand,
  DeleteDailyBrokerTaxResult,
  ImportDailyBrokerTaxesCommand,
  ImportDailyBrokerTaxesResult,
  ListDailyBrokerTaxesResult,
  SaveDailyBrokerTaxCommand,
  SaveDailyBrokerTaxResult,
} from '../contracts/ingestion/daily-broker-tax.contract';

export type ElectronApi = {
  appName: string;
  importSelectFile: () => Promise<{ filePath: string | null }>;
  previewImportTransactions: (
    input: PreviewImportTransactionsCommand,
  ) => Promise<PreviewImportTransactionsResult>;
  confirmImportTransactions: (
    input: ConfirmImportTransactionsCommand,
  ) => Promise<ConfirmImportTransactionsResult>;
  listDailyBrokerTaxes: () => Promise<ListDailyBrokerTaxesResult>;
  saveDailyBrokerTax: (input: SaveDailyBrokerTaxCommand) => Promise<SaveDailyBrokerTaxResult>;
  importDailyBrokerTaxes: (
    input: ImportDailyBrokerTaxesCommand,
  ) => Promise<ImportDailyBrokerTaxesResult>;
  deleteDailyBrokerTax: (input: DeleteDailyBrokerTaxCommand) => Promise<DeleteDailyBrokerTaxResult>;
  saveInitialBalanceDocument: (
    input: SaveInitialBalanceDocumentCommand,
  ) => Promise<SaveInitialBalanceDocumentResult>;
  listInitialBalanceDocuments: (
    input: ListInitialBalanceDocumentsQuery,
  ) => Promise<ListInitialBalanceDocumentsResult>;
  deleteInitialBalanceDocument: (
    input: DeleteInitialBalanceDocumentCommand,
  ) => Promise<DeleteInitialBalanceDocumentResult>;
  listPositions: (input: ListPositionsQuery) => Promise<ListPositionsResult>;
  generateAssetsReport: (input: GenerateAssetsReportQuery) => Promise<GenerateAssetsReportResult>;
  generateCapitalGainsAssessment: (
    input: GenerateCapitalGainsAssessmentQuery,
  ) => Promise<GenerateCapitalGainsAssessmentResult>;
  listAssets: (input?: ListAssetsQuery) => Promise<ListAssetsResult>;
  updateAsset: (input: UpdateAssetCommand) => Promise<UpdateAssetResult>;
  repairAssetType: (input: RepairAssetTypeCommand) => Promise<RepairAssetTypeResult>;
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
