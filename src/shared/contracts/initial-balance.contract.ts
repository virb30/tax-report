import type { AssetType } from '../types/domain';

export type SetInitialBalanceCommand = {
  ticker: string;
  brokerId: string;
  assetType: AssetType;
  quantity: number;
  averagePrice: number;
  year: number;
};

export type SetInitialBalanceResult = {
  ticker: string;
  brokerId: string;
  quantity: number;
  averagePrice: number;
};
