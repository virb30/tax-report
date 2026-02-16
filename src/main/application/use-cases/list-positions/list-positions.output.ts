export interface BrokerBreakdownItem {
  brokerId: string;
  brokerName: string;
  brokerCnpj: string;
  quantity: number;
};

export interface PositionListItem {
  ticker: string;
  assetType: string;
  totalQuantity: number;
  averagePrice: number;
  totalCost: number;
  brokerBreakdown: BrokerBreakdownItem[];
};

export interface ListPositionsOutput {
  items: PositionListItem[];
};
