import type { Broker } from '../../types/broker.types';
import { getTaxReportApi } from './tax-report-api-provider';

export async function listBrokers(): Promise<Broker[]> {
  const result = await getTaxReportApi().listBrokers();
  return result.items.map((item) => ({
    id: item.id,
    name: item.name,
    cnpj: item.cnpj,
    code: item.code,
    active: item.active,
  }));
}

export async function listActiveBrokers(): Promise<Broker[]> {
  const result = await getTaxReportApi().listBrokers({ activeOnly: true });
  return result.items.map((item) => ({
    id: item.id,
    name: item.name,
    cnpj: item.cnpj,
    code: item.code,
    active: item.active,
  }));
}
