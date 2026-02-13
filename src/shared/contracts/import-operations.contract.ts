import type { AssetType, OperationType, SourceType } from '@shared/types/domain';

export type ImportOperationInput = {
  ticker: string;
  assetType: AssetType;
  operationType: OperationType;
  quantity: number;
  unitPrice: number;
  irrfWithheld: number;
};

export type ImportOperationsCommand = {
  tradeDate: string;
  broker: string;
  sourceType: SourceType;
  totalOperationalCosts: number;
  importBatchId?: string;
  operations: ImportOperationInput[];
};

export type ImportOperationsResult = {
  createdOperationsCount: number;
  recalculatedPositionsCount: number;
};
