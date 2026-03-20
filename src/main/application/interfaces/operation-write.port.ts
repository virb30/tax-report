import type { OperationType, SourceType } from '../../../shared/types/domain';

export type OperationWriteInput = {
  tradeDate: string;
  operationType: OperationType;
  ticker: string;
  quantity: number;
  unitPrice: number;
  operationalCosts: number;
  irrfWithheld: number;
  broker: string;
  sourceType: SourceType;
  externalRef?: string;
  importBatchId?: string;
};

export interface OperationWritePort {
  create(input: OperationWriteInput): Promise<unknown>;
  createIfNotExists(input: OperationWriteInput & { externalRef: string }): Promise<boolean>;
}
