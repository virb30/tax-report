export enum AssetType {
  Stock = 'stock',
  Fii = 'fii',
  Etf = 'etf',
  Bdr = 'bdr',
}

export enum OperationType {
  Buy = 'buy',
  Sell = 'sell',
}

export enum SourceType {
  Pdf = 'pdf',
  Csv = 'csv',
  Manual = 'manual',
}

export type Asset = {
  id: number;
  ticker: string;
  name: string | null;
  cnpj: string | null;
  assetType: AssetType;
  broker: string;
  averagePrice: number;
  quantity: number;
  isManualBase: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Operation = {
  id: number;
  tradeDate: string;
  operationType: OperationType;
  ticker: string;
  quantity: number;
  unitPrice: number;
  operationalCosts: number;
  irrfWithheld: number;
  broker: string;
  sourceType: SourceType;
  importedAt: string;
  externalRef: string | null;
  importBatchId: string | null;
};

export type AccumulatedLoss = {
  id: number;
  assetType: AssetType;
  amount: number;
  updatedAt: string;
};

export type TaxConfig = {
  id: number;
  assetType: AssetType;
  taxRate: number;
  monthlyExemptionLimit: number;
  irrfRate: number;
};
