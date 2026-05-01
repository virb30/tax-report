export interface BrokerBreakdownItem {
  brokerId: string;
  brokerName: string;
  brokerCnpj: string;
  quantity: string;
};

export interface PositionListItem {
  ticker: string;
  assetType: string;
  totalQuantity: string;
  averagePrice: string;
  totalCost: string;
  brokerBreakdown: BrokerBreakdownItem[];
};

export interface ListPositionsOutput {
  items: PositionListItem[];
};
