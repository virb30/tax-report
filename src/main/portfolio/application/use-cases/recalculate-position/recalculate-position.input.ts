import type { AssetType, AveragePriceFeeMode } from '../../../../../shared/types/domain';

export interface RecalculatePositionInput {
  ticker: string;
  year: number;
  assetType?: AssetType;
  averagePriceFeeMode?: AveragePriceFeeMode;
}
