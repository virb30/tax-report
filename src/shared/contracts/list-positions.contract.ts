import type { AssetType } from '@shared/types/domain';

export type PositionListItem = {
  ticker: string;
  broker: string;
  assetType: AssetType;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  isManualBase: boolean;
};

export type ListPositionsResult = {
  items: PositionListItem[];
};
