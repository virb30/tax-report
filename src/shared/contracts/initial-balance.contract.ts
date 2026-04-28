import type { AssetType } from '../types/domain';
import type { IpcResult } from '../ipc/ipc-result';

export type SetInitialBalanceCommand = {
  ticker: string;
  brokerId: string;
  assetType: AssetType;
  quantity: number;
  averagePrice: number;
  year: number;
};

export type SetInitialBalanceData = {
  ticker: string;
  brokerId: string;
  quantity: number;
  averagePrice: number;
};

export type SetInitialBalanceResult = IpcResult<SetInitialBalanceData>;
