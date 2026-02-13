import type { AssetType } from '@shared/types/domain';

export type SetManualBaseCommand = {
  ticker: string;
  broker: string;
  assetType: AssetType;
  quantity: number;
  averagePrice: number;
};

export type SetManualBaseResult = {
  ticker: string;
  broker: string;
  quantity: number;
  averagePrice: number;
  isManualBase: boolean;
};
