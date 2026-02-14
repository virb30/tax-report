import type { AssetType } from '@shared/types/domain';

export type BrokerBreakdownItem = {
  brokerId: string;
  brokerName: string;
  brokerCnpj: string;
  quantity: number;
};

export type PositionListItem = {
  ticker: string;
  assetType: AssetType;
  totalQuantity: number;
  averagePrice: number;
  totalCost: number;
  brokerBreakdown: BrokerBreakdownItem[];
};

export type ListPositionsResult = {
  items: PositionListItem[];
};
