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

type JsonErrorBody = {
  error?: {
    message?: unknown;
  };
};

export class HttpTaxReportApi implements TaxReportApi {
  readonly appName = 'tax-report';

  constructor(private readonly baseUrl = '/api') {}

  async previewImportTransactions(input: FileUploadRequest): Promise<ImportPreviewResponse> {
    return this.postMultipart('/import/transactions/preview', input.file);
  }

  async previewTransactionImport(input: FileUploadRequest): Promise<ImportPreviewResponse> {
    return this.previewImportTransactions(input);
  }

  async confirmImportTransactions(input: ConfirmImportRequest): Promise<ConfirmImportResponse> {
    return this.postMultipart('/import/transactions/confirm', input.file, {
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
    return this.postJson('/initial-balances', input);
  }

  async listInitialBalanceDocuments(
    input: ListInitialBalanceDocumentsRequest,
  ): Promise<ListInitialBalanceDocumentsResponse> {
    return this.getJson('/initial-balances', { year: input.year });
  }

  async deleteInitialBalanceDocument(
    input: DeleteInitialBalanceDocumentRequest,
  ): Promise<DeleteInitialBalanceDocumentResponse> {
    return this.requestJson(`/initial-balances/${input.year}/${input.ticker}`, {
      method: 'DELETE',
    });
  }

  async listPositions(input: ListPositionsRequest): Promise<ListPositionsResponse> {
    return this.getJson('/positions', { year: input.baseYear });
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
    return this.patchJson(`/assets/${ticker}`, body);
  }

  async repairAssetType(input: RepairAssetTypeRequest): Promise<RepairAssetTypeResponse> {
    return this.postJson(`/assets/${input.ticker}/repair-type`, {
      assetType: input.assetType,
    });
  }

  async listBrokers(input: ListBrokersRequest = {}): Promise<ListBrokersResponse> {
    return this.getJson('/brokers', input);
  }

  async createBroker(input: CreateBrokerRequest): Promise<CreateBrokerResponse> {
    return this.postJson('/brokers', input);
  }

  async updateBroker(input: UpdateBrokerRequest): Promise<UpdateBrokerResponse> {
    const { id, ...body } = input;
    return this.patchJson(`/brokers/${id}`, body);
  }

  async toggleBrokerActive(input: ToggleBrokerActiveRequest): Promise<ToggleBrokerActiveResponse> {
    return this.postJson(`/brokers/${input.id}/toggle-active`, {});
  }

  async recalculatePosition(
    input: RecalculatePositionRequest,
  ): Promise<RecalculatePositionResponse> {
    return this.postJson('/positions/recalculate', input);
  }

  async migrateYear(input: MigrateYearRequest): Promise<MigrateYearResponse> {
    return this.postJson('/positions/migrate-year', input);
  }

  async previewConsolidatedPosition(
    input: FileUploadRequest,
  ): Promise<PreviewConsolidatedPositionResponse> {
    return this.postMultipart('/positions/consolidated-preview', input.file);
  }

  async importConsolidatedPosition(
    input: ImportConsolidatedPositionRequest,
  ): Promise<ImportConsolidatedPositionResponse> {
    return this.postMultipart('/positions/consolidated-import', input.file, {
      year: String(input.year),
      assetTypeOverrides: JSON.stringify(input.assetTypeOverrides),
    });
  }

  async deletePosition(input: DeletePositionRequest): Promise<DeletePositionResponse> {
    return this.requestJson(
      this.buildPath('/positions', { year: input.year, ticker: input.ticker }),
      {
        method: 'DELETE',
      },
    );
  }

  async deleteAllPositions(input: DeleteAllPositionsRequest): Promise<DeleteAllPositionsResponse> {
    return this.requestJson(this.buildPath('/positions', { year: input.year }), {
      method: 'DELETE',
    });
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
