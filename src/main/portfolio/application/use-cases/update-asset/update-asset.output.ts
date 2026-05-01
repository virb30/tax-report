import type { AssetType, AssetTypeSource } from '../../../../../shared/types/domain';

export interface UpdateAssetOutput {
  ticker: string;
  assetType: AssetType | null;
  resolutionSource: AssetTypeSource | null;
  name: string | null;
  cnpj: string | null;
  isReportReadyMetadata: boolean;
}
