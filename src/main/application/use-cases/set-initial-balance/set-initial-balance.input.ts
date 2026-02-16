import type { AssetType } from '../../../../shared/types/domain';

export interface SetInitialBalanceInput {
  ticker: string;
  brokerId: string;
  assetType: AssetType;
  quantity: number;
  averagePrice: number;
  year: number;
}
