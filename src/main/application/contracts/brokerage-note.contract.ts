import type { AssetType, OperationType, SourceType } from '../../../shared/types/domain';

export type BrokerageNoteOperationInput = {
  ticker: string;
  assetType: AssetType;
  operationType: OperationType;
  quantity: number;
  unitPrice: number;
  irrfWithheld: number;
};

export type BrokerageNoteInput = {
  tradeDate: string;
  broker: string;
  sourceType: SourceType;
  totalOperationalCosts: number;
  operations: BrokerageNoteOperationInput[];
};
