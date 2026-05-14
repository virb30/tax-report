import { AssetType } from '../../types/api.types';
import { HttpTaxReportApi } from './http-tax-report-api';

type FetchCall = [RequestInfo | URL, RequestInit?];

const jsonHeaders = { 'Content-Type': 'application/json' };

describe('HttpTaxReportApi', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
  });

  it('sends expected methods, paths, and JSON bodies for workflow routes', async () => {
    const api = new HttpTaxReportApi('/api');
    fetchMock.mockResolvedValue(createJsonResponse({ ok: true }));

    await api.listBrokers({ activeOnly: true });
    await api.createBroker({ name: 'XP', cnpj: '02.332.886/0001-04', code: 'XP' });
    await api.updateBroker({ id: 'broker-xp', name: 'XP Investimentos' });
    await api.toggleBrokerActive({ id: 'broker-xp' });
    await api.listAssets({ pendingOnly: true, reportBlockingOnly: false });
    await api.updateAsset({ ticker: 'PETR4', name: 'Petrobras' });
    await api.repairAssetType({ ticker: 'PETR4', assetType: AssetType.Stock });
    await api.listInitialBalanceDocuments({ year: 2025 });
    await api.saveInitialBalanceDocument({
      ticker: 'PETR4',
      year: 2025,
      assetType: AssetType.Stock,
      averagePrice: '30',
      allocations: [{ brokerId: 'broker-xp', quantity: '10' }],
    });
    await api.deleteInitialBalanceDocument({ ticker: 'PETR4', year: 2025 });
    await api.listPositions({ baseYear: 2025 });
    await api.recalculatePosition({ ticker: 'PETR4', year: 2025 });
    await api.migrateYear({ sourceYear: 2024, targetYear: 2025 });
    await api.deletePosition({ ticker: 'PETR4', year: 2025 });
    await api.deleteAllPositions({ year: 2025 });
    await api.listDailyBrokerTaxes();
    await api.saveDailyBrokerTax({
      date: '2025-03-10',
      brokerId: 'broker-xp',
      fees: 3.5,
      irrf: 0.15,
    });
    await api.deleteDailyBrokerTax({ date: '2025-03-10', brokerId: 'broker-xp' });
    await api.listMonthlyTaxHistory({ startYear: 2024 });
    await api.getMonthlyTaxDetail({ month: '2025-03' });
    await api.recalculateMonthlyTaxHistory({ startYear: 2024, reason: 'manual' });
    await api.generateAssetsReport({ baseYear: 2025 });

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method, readBody(init)])).toEqual([
      ['/api/brokers?activeOnly=true', 'GET', undefined],
      ['/api/brokers', 'POST', { name: 'XP', cnpj: '02.332.886/0001-04', code: 'XP' }],
      ['/api/brokers/broker-xp', 'PATCH', { name: 'XP Investimentos' }],
      ['/api/brokers/broker-xp/toggle-active', 'POST', {}],
      ['/api/assets?pendingOnly=true&reportBlockingOnly=false', 'GET', undefined],
      ['/api/assets/PETR4', 'PATCH', { name: 'Petrobras' }],
      ['/api/assets/PETR4/repair-type', 'POST', { assetType: AssetType.Stock }],
      ['/api/initial-balances?year=2025', 'GET', undefined],
      [
        '/api/initial-balances',
        'POST',
        {
          ticker: 'PETR4',
          year: 2025,
          assetType: AssetType.Stock,
          averagePrice: '30',
          allocations: [{ brokerId: 'broker-xp', quantity: '10' }],
        },
      ],
      ['/api/initial-balances/2025/PETR4', 'DELETE', undefined],
      ['/api/positions?year=2025', 'GET', undefined],
      ['/api/positions/recalculate', 'POST', { ticker: 'PETR4', year: 2025 }],
      ['/api/positions/migrate-year', 'POST', { sourceYear: 2024, targetYear: 2025 }],
      ['/api/positions?year=2025&ticker=PETR4', 'DELETE', undefined],
      ['/api/positions?year=2025', 'DELETE', undefined],
      ['/api/daily-broker-taxes', 'GET', undefined],
      [
        '/api/daily-broker-taxes',
        'POST',
        { date: '2025-03-10', brokerId: 'broker-xp', fees: 3.5, irrf: 0.15 },
      ],
      ['/api/daily-broker-taxes/2025-03-10/broker-xp', 'DELETE', undefined],
      ['/api/monthly-tax/history?startYear=2024', 'GET', undefined],
      ['/api/monthly-tax/months/2025-03', 'GET', undefined],
      ['/api/monthly-tax/recalculate', 'POST', { startYear: 2024, reason: 'manual' }],
      ['/api/reports/assets?baseYear=2025', 'GET', undefined],
    ]);
    expect(fetchMock.mock.calls[1][1]?.headers).toEqual(jsonHeaders);
  });

  it('sends multipart form data for browser-selected import files', async () => {
    const api = new HttpTaxReportApi('/api');
    const file = new File(['ticker,quantity'], 'positions.csv', { type: 'text/csv' });
    fetchMock.mockResolvedValue(createJsonResponse({ importedCount: 1 }));

    await api.previewImportTransactions({ file });
    await api.confirmImportTransactions({
      file,
      assetTypeOverrides: [{ ticker: 'PETR4', assetType: AssetType.Stock }],
    });
    await api.importDailyBrokerTaxes({ file });
    await api.previewConsolidatedPosition({ file });
    await api.importConsolidatedPosition({
      file,
      year: 2025,
      assetTypeOverrides: [{ ticker: 'PETR4', assetType: AssetType.Stock }],
    });

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ['/api/import/transactions/preview', 'POST'],
      ['/api/import/transactions/confirm', 'POST'],
      ['/api/daily-broker-taxes/import', 'POST'],
      ['/api/positions/consolidated-preview', 'POST'],
      ['/api/positions/consolidated-import', 'POST'],
    ]);

    const confirmForm = getFormData(fetchMock.mock.calls[1]);
    expect(confirmForm.get('file')).toBe(file);
    expect(confirmForm.get('assetTypeOverrides')).toBe(
      JSON.stringify([{ ticker: 'PETR4', assetType: AssetType.Stock }]),
    );

    const consolidatedForm = getFormData(fetchMock.mock.calls[4]);
    expect(consolidatedForm.get('file')).toBe(file);
    expect(consolidatedForm.get('year')).toBe('2025');
    expect(consolidatedForm.get('assetTypeOverrides')).toBe(
      JSON.stringify([{ ticker: 'PETR4', assetType: AssetType.Stock }]),
    );
  });

  it('maps HTTP error JSON to user-facing messages', async () => {
    const api = new HttpTaxReportApi('/api');
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Arquivo inválido.',
            details: { internalPath: '/tmp/private.csv' },
          },
        },
        { ok: false, status: 400 },
      ),
    );

    await expect(api.listBrokers()).rejects.toThrow('Arquivo inválido.');
  });
});

function createJsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

function readBody(init: RequestInit | undefined): unknown {
  if (typeof init?.body !== 'string') {
    return undefined;
  }

  return JSON.parse(init.body) as unknown;
}

function getFormData(call: FetchCall): FormData {
  const body = call[1]?.body;
  if (!(body instanceof FormData)) {
    throw new Error('Expected request body to be FormData.');
  }

  return body;
}
