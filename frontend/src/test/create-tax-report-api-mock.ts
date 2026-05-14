import mock, { mockReset, type MockProxy } from 'jest-mock-extended/lib/Mock';

import { setTaxReportApiForTesting } from '@/services/api/tax-report-api-provider';
import type { TaxReportApi } from '@/services/api/tax-report-api';

export type TaxReportApiMock = MockProxy<TaxReportApi>;

export function createTaxReportApiMock(): TaxReportApiMock {
  const api = mock<TaxReportApi>();
  api.appName = 'tax-report';

  return api;
}

export function resetTaxReportApiMock(api: TaxReportApiMock): void {
  mockReset(api);
  api.appName = 'tax-report';
}

export function installTaxReportApiMock(api: TaxReportApiMock): void {
  setTaxReportApiForTesting(api);
}
