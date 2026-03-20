import { AssetType } from "../../../shared/types/domain";

export interface RevenueClassification {
  group: string;
  code: string;
}

export interface AssetsReportAllocation {
  brokerId: string;
  brokerName: string;
  cnpj: string;
  quantity: number;
  totalCost: number;
  description: string;
}

export interface AssetsReportItem {
  ticker: string;
  assetType: AssetType;
  totalQuantity: number;
  averagePrice: number;
  totalCost: number;
  revenueClassification: RevenueClassification;
  allocations: AssetsReportAllocation[];
}

export interface GenerateAssetReportOutput {
  referenceDate: string;
  items: AssetsReportItem[];
}