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
import type { TaxReportApi } from './tax-report-api';

type QueryValue = string | number | boolean | undefined;
type QueryParams = Record<string, QueryValue>;
type UnwrappedApiResult<TResponse> = TResponse extends { ok: true; data: infer TData } ? TData : never;

type JsonErrorBody = {
  error?: {
    message?: unknown;
  };
};

type AssetPayload = ListAssetsResponse['items'][number];
type BrokerPayload = ListBrokersResponse['items'][number];
type InitialBalanceDocumentPayload = UnwrappedApiResult<SaveInitialBalanceDocumentResponse>;
type InitialBalanceDocumentListPayload = UnwrappedApiResult<ListInitialBalanceDocumentsResponse>;
type PositionListPayload = UnwrappedApiResult<ListPositionsResponse>;
type DeleteInitialBalancePayload = UnwrappedApiResult<DeleteInitialBalanceDocumentResponse>;
type RecalculatePositionPayload = UnwrappedApiResult<RecalculatePositionResponse>;
type MigrateYearPayload = UnwrappedApiResult<MigrateYearResponse>;
type PreviewConsolidatedPositionPayload = UnwrappedApiResult<PreviewConsolidatedPositionResponse>;
type ImportConsolidatedPositionPayload = UnwrappedApiResult<ImportConsolidatedPositionResponse>;
type DeletePositionPayload = UnwrappedApiResult<DeletePositionResponse>;
type DeleteAllPositionsPayload = UnwrappedApiResult<DeleteAllPositionsResponse>;
type RepairAssetTypePayload = Extract<RepairAssetTypeResponse, { success: true }>['repair'];

export class HttpTaxReportApi implements TaxReportApi {
  readonly appName = 'tax-report';

  constructor(private readonly baseUrl = '/api') {}

  async previewImportTransactions(input: FileUploadRequest): Promise<ImportPreviewResponse> {
    return this.postMultipart('/transactions/import:preview', input.file);
  }

  async previewTransactionImport(input: FileUploadRequest): Promise<ImportPreviewResponse> {
    return this.previewImportTransactions(input);
  }

  async confirmImportTransactions(input: ConfirmImportRequest): Promise<ConfirmImportResponse> {
    return this.postMultipart('/transactions/import:confirm', input.file, {
      assetTypeOverrides: JSON.stringify(input.assetTypeOverrides),
    });
  }

  async confirmTransactionImport(input: ConfirmImportRequest): Promise<ConfirmImportResponse> {
    return this.confirmImportTransactions(input);
  }

  async listDailyBrokerTaxes(): Promise<ListDailyBrokerTaxesResponse> {
    return this.getJson('/daily-broker-taxes');
  }

  async saveDailyBrokerTax(input: SaveDailyBrokerTaxRequest): Promise<SaveDailyBrokerTaxResponse> {
    return this.postJson('/daily-broker-taxes', input);
  }

  async importDailyBrokerTaxes(input: FileUploadRequest): Promise<ImportDailyBrokerTaxesResponse> {
    return this.postMultipart('/daily-broker-taxes/import', input.file);
  }

  async deleteDailyBrokerTax(
    input: DeleteDailyBrokerTaxRequest,
  ): Promise<DeleteDailyBrokerTaxResponse> {
    return this.requestJson(`/daily-broker-taxes/${input.date}/${input.brokerId}`, {
      method: 'DELETE',
    });
  }

  async saveInitialBalanceDocument(
    input: SaveInitialBalanceDocumentRequest,
  ): Promise<SaveInitialBalanceDocumentResponse> {
    const document = await this.postJson<InitialBalanceDocumentPayload>('/initial-balances', input);
    return wrapApiResult(document);
  }

  async listInitialBalanceDocuments(
    input: ListInitialBalanceDocumentsRequest,
  ): Promise<ListInitialBalanceDocumentsResponse> {
    const data = await this.getJson<InitialBalanceDocumentListPayload>('/initial-balances', {
      year: input.year,
    });
    return wrapApiResult(data);
  }

  async deleteInitialBalanceDocument(
    input: DeleteInitialBalanceDocumentRequest,
  ): Promise<DeleteInitialBalanceDocumentResponse> {
    const data = await this.requestJson<DeleteInitialBalancePayload>(
      `/initial-balances/${input.year}/${input.ticker}`,
      {
        method: 'DELETE',
      },
    );
    return wrapApiResult(data);
  }

  async listPositions(input: ListPositionsRequest): Promise<ListPositionsResponse> {
    const data = await this.getJson<PositionListPayload>('/positions', { year: input.baseYear });
    return wrapApiResult(data);
  }

  async generateAssetsReport(
    input: GenerateAssetsReportRequest,
  ): Promise<GenerateAssetsReportResponse> {
    return this.getJson('/reports/assets', { baseYear: input.baseYear });
  }

  async listMonthlyTaxHistory(
    input: MonthlyTaxHistoryRequest = {},
  ): Promise<MonthlyTaxHistoryResponse> {
    return this.getJson('/monthly-tax/history', input);
  }

  async getMonthlyTaxDetail(input: MonthlyTaxDetailRequest): Promise<MonthlyTaxDetailResponse> {
    return this.getJson(`/monthly-tax/months/${input.month}`);
  }

  async recalculateMonthlyTaxHistory(
    input: RecalculateMonthlyTaxHistoryRequest,
  ): Promise<RecalculateMonthlyTaxHistoryResponse> {
    return this.postJson('/monthly-tax/recalculate', input);
  }

  async listAssets(input: ListAssetsRequest = {}): Promise<ListAssetsResponse> {
    return this.getJson('/assets', input);
  }

  async updateAsset(input: UpdateAssetRequest): Promise<UpdateAssetResponse> {
    const { ticker, ...body } = input;
    const asset = await this.patchJson<AssetPayload>(`/assets/${ticker}`, body);
    return {
      success: true,
      asset,
    };
  }

  async repairAssetType(input: RepairAssetTypeRequest): Promise<RepairAssetTypeResponse> {
    const repair = await this.postJson<RepairAssetTypePayload>(`/assets/${input.ticker}/repair-type`, {
      assetType: input.assetType,
    });
    return {
      success: true,
      repair,
    };
  }

  async listBrokers(input: ListBrokersRequest = {}): Promise<ListBrokersResponse> {
    return this.getJson('/brokers', input);
  }

  async createBroker(input: CreateBrokerRequest): Promise<CreateBrokerResponse> {
    const broker = await this.postJson<BrokerPayload>('/brokers', input);
    return {
      success: true,
      broker,
    };
  }

  async updateBroker(input: UpdateBrokerRequest): Promise<UpdateBrokerResponse> {
    const { id, ...body } = input;
    const broker = await this.patchJson<BrokerPayload>(`/brokers/${id}`, body);
    return {
      success: true,
      broker,
    };
  }

  async toggleBrokerActive(input: ToggleBrokerActiveRequest): Promise<ToggleBrokerActiveResponse> {
    const broker = await this.postJson<BrokerPayload>(`/brokers/${input.id}/toggle-active`, {});
    return {
      success: true,
      broker,
    };
  }

  async recalculatePosition(
    input: RecalculatePositionRequest,
  ): Promise<RecalculatePositionResponse> {
    const data = await this.postJson<RecalculatePositionPayload>('/positions/recalculate', input);
    return wrapApiResult(data);
  }

  async migrateYear(input: MigrateYearRequest): Promise<MigrateYearResponse> {
    const data = await this.postJson<MigrateYearPayload>('/positions/migrate-year', input);
    return wrapApiResult(data);
  }

  async previewConsolidatedPosition(
    input: FileUploadRequest,
  ): Promise<PreviewConsolidatedPositionResponse> {
    const data = await this.postMultipart<PreviewConsolidatedPositionPayload>(
      '/positions/consolidated-preview',
      input.file,
    );
    return wrapApiResult(data);
  }

  async importConsolidatedPosition(
    input: ImportConsolidatedPositionRequest,
  ): Promise<ImportConsolidatedPositionResponse> {
    const data = await this.postMultipart<ImportConsolidatedPositionPayload>(
      '/positions/consolidated-import',
      input.file,
      {
        year: String(input.year),
        assetTypeOverrides: JSON.stringify(input.assetTypeOverrides),
      },
    );
    return wrapApiResult(data);
  }

  async deletePosition(input: DeletePositionRequest): Promise<DeletePositionResponse> {
    const data = await this.requestJson<DeletePositionPayload>(
      this.buildPath(`/positions/${encodeURIComponent(input.ticker)}`, { year: input.year }),
      {
        method: 'DELETE',
      },
    );
    return wrapApiResult(data);
  }

  async deleteAllPositions(input: DeleteAllPositionsRequest): Promise<DeleteAllPositionsResponse> {
    const data = await this.requestJson<DeleteAllPositionsPayload>(
      this.buildPath('/positions', { year: input.year }),
      {
        method: 'DELETE',
      },
    );
    return wrapApiResult(data);
  }

  private async getJson<T>(path: string, query: QueryParams = {}): Promise<T> {
    return this.requestJson(this.buildPath(path, query), { method: 'GET' });
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    return this.requestJson(path, {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  }

  private async patchJson<T>(path: string, body: unknown): Promise<T> {
    return this.requestJson(path, {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    });
  }

  private async postMultipart<T>(
    path: string,
    file: File,
    fields: Record<string, string> = {},
  ): Promise<T> {
    const body = new FormData();
    body.append('file', file);
    Object.entries(fields).forEach(([key, value]) => body.append(key, value));

    return this.requestJson(path, {
      body,
      method: 'POST',
    });
  }

  private async requestJson<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(this.toUrl(path), init);
    const body = await this.readJson(response);

    if (!response.ok) {
      throw new Error(readErrorMessage(body));
    }

    return body as T;
  }

  private async readJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (text.length === 0) {
      return undefined;
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      if (!response.ok) {
        return undefined;
      }

      throw new Error('Resposta inválida da API.');
    }
  }

  private buildPath(path: string, query: QueryParams): string {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    });

    const queryString = params.toString();
    return queryString.length > 0 ? `${path}?${queryString}` : path;
  }

  private toUrl(path: string): string {
    const normalizedBaseUrl = this.baseUrl.replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBaseUrl}${normalizedPath}`;
  }
}

function readErrorMessage(body: unknown): string {
  if (isJsonErrorBody(body) && typeof body.error?.message === 'string') {
    return body.error.message;
  }

  return 'Erro ao comunicar com a API.';
}

function isJsonErrorBody(value: unknown): value is JsonErrorBody {
  return typeof value === 'object' && value !== null && 'error' in value;
}

function wrapApiResult<T>(data: T) {
  return {
    ok: true as const,
    data,
  };
}
