import type { AssetType } from '../../../shared/types/domain';

export interface ReportItemOutput {
  ticker: string;
  assetType: AssetType;
  totalQuantity: number;
  averagePrice: number;
  totalCost: number;
  revenueClassification: { group: string; code: string };
  allocations: Array<{
    brokerId: string;
    brokerName: string;
    cnpj: string;
    quantity: number;
    totalCost: number;
    description: string;
  }>;
}