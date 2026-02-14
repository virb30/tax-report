import type { AssetType } from '@shared/types/domain';

export type SetInitialBalanceCommand = {
  ticker: string;
  brokerId: string;
  assetType: AssetType;
  quantity: number;
  averagePrice: number;
  /** Ano ao qual o saldo inicial se refere (ex: 2024 → transação em 2024-01-01) */
  year: number;
};

export type SetInitialBalanceResult = {
  ticker: string;
  brokerId: string;
  quantity: number;
  averagePrice: number;
};
