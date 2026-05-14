import { HttpTaxReportApi } from './http-tax-report-api';
import type { TaxReportApi } from './tax-report-api';

let taxReportApi: TaxReportApi = new HttpTaxReportApi();

export function getTaxReportApi(): TaxReportApi {
  return taxReportApi;
}

export function setTaxReportApiForTesting(api: TaxReportApi): void {
  taxReportApi = api;
}

export function resetTaxReportApiForTesting(): void {
  taxReportApi = new HttpTaxReportApi();
}
