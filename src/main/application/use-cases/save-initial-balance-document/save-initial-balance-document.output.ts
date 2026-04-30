import type { AssetType } from '../../../../shared/types/domain';

export interface InitialBalanceAllocationOutput {
  brokerId: string;
  quantity: string;
}

export interface SaveInitialBalanceDocumentOutput {
  ticker: string;
  year: number;
  assetType: AssetType;
  averagePrice: string;
  allocations: InitialBalanceAllocationOutput[];
  totalQuantity: string;
}