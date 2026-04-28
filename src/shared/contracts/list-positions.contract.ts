import type { AssetType } from '../types/domain';
import type { IpcResult } from '../ipc/ipc-result';

export type ListPositionsQuery = {
  /** Posição consolidada em 31/12 deste ano */
  baseYear: number;
};

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

export type ListPositionsData = {
  items: PositionListItem[];
};

export type ListPositionsResult = IpcResult<ListPositionsData>;
