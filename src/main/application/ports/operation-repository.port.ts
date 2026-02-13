import type { OperationType, SourceType } from '../../../shared/types/domain';

export type OperationWritePayload = {
  tradeDate: string;
  operationType: OperationType;
  ticker: string;
  quantity: number;
  unitPrice: number;
  operationalCosts: number;
  irrfWithheld: number;
  broker: string;
  sourceType: SourceType;
  importedAt?: string;
  externalRef?: string;
  importBatchId?: string;
};

export type PeriodOperationRecord = {
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

export interface OperationRepositoryPort {
  saveMany(operations: OperationWritePayload[]): Promise<void>;
  findByPeriod(input: { startDate: string; endDate: string }): Promise<PeriodOperationRecord[]>;
}
