import type { AssetType } from '../../../../../shared/types/domain';

export interface RepairAssetTypeOutput {
  ticker: string;
  assetType: AssetType;
  affectedYears: number[];
  reprocessedCount: number;
}
