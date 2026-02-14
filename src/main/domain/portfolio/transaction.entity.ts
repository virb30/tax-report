import type { SourceType, TransactionType } from '../../../shared/types/domain';

export type TransactionRecord = {
  id: string;
  date: string;
  type: TransactionType;
  ticker: string;
  quantity: number;
  unitPrice: number;
  fees: number;
  brokerId: string;
  sourceType: SourceType;
  externalRef?: string;
  importBatchId?: string;
};
