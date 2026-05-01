import type { AssetType } from '../../../../shared/types/domain';

export type ConsolidatedPositionRow = {
  ticker: string;
  quantity: number;
  averagePrice: number;
  brokerCode: string;
  sourceAssetType: AssetType | null;
  sourceAssetTypeLabel: string | null;
};

export interface ConsolidatedPositionParserPort {
  parse(filePath: string): Promise<ConsolidatedPositionRow[]>;
}
