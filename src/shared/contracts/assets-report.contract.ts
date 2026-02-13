import type { AssetType } from '@shared/types/domain';

export type GenerateAssetsReportQuery = {
  baseYear: number;
};

export type RevenueClassification = {
  group: string;
  code: string;
};

export type AssetsReportItem = {
  ticker: string;
  broker: string;
  assetType: AssetType;
  name?: string | null;
  cnpj?: string | null;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  revenueClassification: RevenueClassification;
  description: string;
};

export type GenerateAssetsReportResult = {
  referenceDate: string;
  items: AssetsReportItem[];
};
