import type { AssetType } from '../../../../../shared/types/domain';

export interface UpdateAssetInput {
  ticker: string;
  assetType?: AssetType;
  name?: string;
  cnpj?: string;
}
