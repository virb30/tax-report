import type { AssetType } from '../../../../../shared/types/domain';

export interface RecalculatePositionInput {
  ticker: string;
  year: number;
  assetType?: AssetType;
}
