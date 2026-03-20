import type { AssetType } from '../types/domain';

export type GenerateAssetsReportQuery = {
  baseYear: number;
};

export type RevenueClassification = {
  group: string;
  code: string;
};

export type AssetsReportAllocation = {
  brokerId: string;
  brokerName: string;
  cnpj: string;
  quantity: number;
  totalCost: number;
  description: string;
};

export type AssetsReportItem = {
  ticker: string;
  assetType: AssetType;
  totalQuantity: number;
  averagePrice: number;
  totalCost: number;
  revenueClassification: RevenueClassification;
  allocations: AssetsReportAllocation[];
};

export type GenerateAssetsReportResult = {
  referenceDate: string;
  items: AssetsReportItem[];
};
