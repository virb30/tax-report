import type { AssetType } from '@shared/types/domain';

export type SetInitialBalanceCommand = {
  ticker: string;
  brokerId: string;
  assetType: AssetType;
  quantity: number;
  averagePrice: number;
};

export type SetInitialBalanceResult = {
  ticker: string;
  brokerId: string;
  quantity: number;
  averagePrice: number;
};
