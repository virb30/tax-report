import { mock, mockReset } from 'jest-mock-extended';
import type { HttpRequest } from '../../../../shared/infra/http/http.interface';
import { RecordingMemoryAdapterHttp } from '../../../../shared/infra/http/recording-memory-adapter.http';
import type { GenerateAssetsReportUseCase } from '../../../application/use-cases/generate-assets-report.use-case';
import type { GetMonthlyTaxDetailUseCase } from '../../../application/use-cases/get-monthly-tax-detail.use-case';
import type { ListMonthlyTaxHistoryUseCase } from '../../../application/use-cases/list-monthly-tax-history.use-case';
import type { RecalculateMonthlyTaxHistoryUseCase } from '../../../application/use-cases/recalculate-monthly-tax-history.use-case';
import { MonthlyTaxController } from './monthly-tax.controller';
import { ReportController } from './report.controller';

function createRequest(
  input: {
    body?: unknown;
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
  } = {},
): HttpRequest {
  return {
    body: input.body ?? {},
    params: input.params ?? {},
    query: input.query ?? {},
    raw: {} as HttpRequest['raw'],
  };
}

describe('tax reporting HTTP controllers', () => {
  const listMonthlyTaxHistoryUseCase = mock<ListMonthlyTaxHistoryUseCase>();
  const getMonthlyTaxDetailUseCase = mock<GetMonthlyTaxDetailUseCase>();
  const recalculateMonthlyTaxHistoryUseCase = mock<RecalculateMonthlyTaxHistoryUseCase>();
  const generateAssetsReportUseCase = mock<GenerateAssetsReportUseCase>();

  beforeEach(() => {
    mockReset(listMonthlyTaxHistoryUseCase);
    mockReset(getMonthlyTaxDetailUseCase);
    mockReset(recalculateMonthlyTaxHistoryUseCase);
    mockReset(generateAssetsReportUseCase);
  });

  it('registers monthly tax routes and parses request data before delegation', async () => {
    const http = new RecordingMemoryAdapterHttp();
    listMonthlyTaxHistoryUseCase.execute.mockResolvedValue({ months: [] });
    getMonthlyTaxDetailUseCase.execute.mockResolvedValue({ month: '2026-01' } as never);
    recalculateMonthlyTaxHistoryUseCase.execute.mockResolvedValue({
      rebuiltMonths: ['2026-01'],
    } as never);

    new MonthlyTaxController(http, {
      listMonthlyTaxHistoryUseCase,
      getMonthlyTaxDetailUseCase,
      recalculateMonthlyTaxHistoryUseCase,
    });

    expect(http.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'get /api/monthly-tax/history',
      'get /api/monthly-tax/months/{month}',
      'post /api/monthly-tax/recalculate',
    ]);

    const historyRoute = http.routes.find((route) => route.path.endsWith('/history'));
    const detailRoute = http.routes.find((route) => route.path.includes('/months/'));
    const recalculateRoute = http.routes.find((route) => route.path.endsWith('/recalculate'));

    await expect(
      historyRoute?.handler(
        createRequest({
          query: {
            startYear: '2026',
          },
        }),
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: { months: [] },
    });
    await expect(
      detailRoute?.handler(
        createRequest({
          params: {
            month: '2026-01',
          },
        }),
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: { month: '2026-01' },
    });
    await expect(
      recalculateRoute?.handler(
        createRequest({
          body: {
            startYear: 2026,
            reason: 'manual',
          },
        }),
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: { rebuiltMonths: ['2026-01'] },
    });

    expect(listMonthlyTaxHistoryUseCase.execute).toHaveBeenCalledWith({
      startYear: 2026,
    });
    expect(getMonthlyTaxDetailUseCase.execute).toHaveBeenCalledWith({
      month: '2026-01',
    });
    expect(recalculateMonthlyTaxHistoryUseCase.execute).toHaveBeenCalledWith({
      startYear: 2026,
      reason: 'manual',
    });
  });

  it('registers the assets report route and parses query parameters before delegation', async () => {
    const http = new RecordingMemoryAdapterHttp();
    generateAssetsReportUseCase.execute.mockResolvedValue({
      referenceDate: '2026-12-31',
      items: [],
    } as never);

    new ReportController(http, {
      generateAssetsReportUseCase,
    });

    const reportRoute = http.routes.find((route) => route.path === '/api/reports/assets');

    await expect(
      reportRoute?.handler(
        createRequest({
          query: {
            baseYear: '2026',
          },
        }),
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: { referenceDate: '2026-12-31', items: [] },
    });

    expect(generateAssetsReportUseCase.execute).toHaveBeenCalledWith({
      baseYear: 2026,
    });
  });
});
