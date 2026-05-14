import type {
  ConfirmImportRequest,
  ConfirmImportResponse,
  CreateBrokerRequest,
  CreateBrokerResponse,
  DeleteAllPositionsRequest,
  DeleteAllPositionsResponse,
  DeleteDailyBrokerTaxRequest,
  DeleteDailyBrokerTaxResponse,
  DeleteInitialBalanceDocumentRequest,
  DeleteInitialBalanceDocumentResponse,
  DeletePositionRequest,
  DeletePositionResponse,
  FileUploadRequest,
  GenerateAssetsReportRequest,
  GenerateAssetsReportResponse,
  ImportConsolidatedPositionRequest,
  ImportConsolidatedPositionResponse,
  ImportDailyBrokerTaxesResponse,
  ImportPreviewResponse,
  ListAssetsRequest,
  ListAssetsResponse,
  ListBrokersRequest,
  ListBrokersResponse,
  ListDailyBrokerTaxesResponse,
  ListInitialBalanceDocumentsRequest,
  ListInitialBalanceDocumentsResponse,
  ListPositionsRequest,
  ListPositionsResponse,
  MigrateYearRequest,
  MigrateYearResponse,
  MonthlyTaxDetailRequest,
  MonthlyTaxDetailResponse,
  MonthlyTaxHistoryRequest,
  MonthlyTaxHistoryResponse,
  PreviewConsolidatedPositionResponse,
  RecalculateMonthlyTaxHistoryRequest,
  RecalculateMonthlyTaxHistoryResponse,
  RecalculatePositionRequest,
  RecalculatePositionResponse,
  RepairAssetTypeRequest,
  RepairAssetTypeResponse,
  SaveDailyBrokerTaxRequest,
  SaveDailyBrokerTaxResponse,
  SaveInitialBalanceDocumentRequest,
  SaveInitialBalanceDocumentResponse,
  ToggleBrokerActiveRequest,
  ToggleBrokerActiveResponse,
  UpdateAssetRequest,
  UpdateAssetResponse,
  UpdateBrokerRequest,
  UpdateBrokerResponse,
} from '../../types/api.types';

export interface TaxReportApi {
  appName: string;
  previewImportTransactions(input: FileUploadRequest): Promise<ImportPreviewResponse>;
  previewTransactionImport(input: FileUploadRequest): Promise<ImportPreviewResponse>;
  confirmImportTransactions(input: ConfirmImportRequest): Promise<ConfirmImportResponse>;
  confirmTransactionImport(input: ConfirmImportRequest): Promise<ConfirmImportResponse>;
  listDailyBrokerTaxes(): Promise<ListDailyBrokerTaxesResponse>;
  saveDailyBrokerTax(input: SaveDailyBrokerTaxRequest): Promise<SaveDailyBrokerTaxResponse>;
  importDailyBrokerTaxes(input: FileUploadRequest): Promise<ImportDailyBrokerTaxesResponse>;
  deleteDailyBrokerTax(input: DeleteDailyBrokerTaxRequest): Promise<DeleteDailyBrokerTaxResponse>;
  saveInitialBalanceDocument(
    input: SaveInitialBalanceDocumentRequest,
  ): Promise<SaveInitialBalanceDocumentResponse>;
  listInitialBalanceDocuments(
    input: ListInitialBalanceDocumentsRequest,
  ): Promise<ListInitialBalanceDocumentsResponse>;
  deleteInitialBalanceDocument(
    input: DeleteInitialBalanceDocumentRequest,
  ): Promise<DeleteInitialBalanceDocumentResponse>;
  listPositions(input: ListPositionsRequest): Promise<ListPositionsResponse>;
  generateAssetsReport(input: GenerateAssetsReportRequest): Promise<GenerateAssetsReportResponse>;
  listMonthlyTaxHistory(input?: MonthlyTaxHistoryRequest): Promise<MonthlyTaxHistoryResponse>;
  getMonthlyTaxDetail(input: MonthlyTaxDetailRequest): Promise<MonthlyTaxDetailResponse>;
  recalculateMonthlyTaxHistory(
    input: RecalculateMonthlyTaxHistoryRequest,
  ): Promise<RecalculateMonthlyTaxHistoryResponse>;
  listAssets(input?: ListAssetsRequest): Promise<ListAssetsResponse>;
  updateAsset(input: UpdateAssetRequest): Promise<UpdateAssetResponse>;
  repairAssetType(input: RepairAssetTypeRequest): Promise<RepairAssetTypeResponse>;
  listBrokers(input?: ListBrokersRequest): Promise<ListBrokersResponse>;
  createBroker(input: CreateBrokerRequest): Promise<CreateBrokerResponse>;
  updateBroker(input: UpdateBrokerRequest): Promise<UpdateBrokerResponse>;
  toggleBrokerActive(input: ToggleBrokerActiveRequest): Promise<ToggleBrokerActiveResponse>;
  recalculatePosition(input: RecalculatePositionRequest): Promise<RecalculatePositionResponse>;
  migrateYear(input: MigrateYearRequest): Promise<MigrateYearResponse>;
  previewConsolidatedPosition(
    input: FileUploadRequest,
  ): Promise<PreviewConsolidatedPositionResponse>;
  importConsolidatedPosition(
    input: ImportConsolidatedPositionRequest,
  ): Promise<ImportConsolidatedPositionResponse>;
  deletePosition(input: DeletePositionRequest): Promise<DeletePositionResponse>;
  deleteAllPositions(input: DeleteAllPositionsRequest): Promise<DeleteAllPositionsResponse>;
}
