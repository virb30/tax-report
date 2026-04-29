import type { AssetType, AssetTypeSource } from '../types/domain';

export type AssetCatalogItem = {
  ticker: string;
  assetType: AssetType | null;
  resolutionSource: AssetTypeSource | null;
  name: string | null;
  cnpj: string | null;
  isReportReadyMetadata: boolean;
};

export type ListAssetsQuery = {
  pendingOnly?: boolean;
  reportBlockingOnly?: boolean;
};

export type ListAssetsResult = {
  items: AssetCatalogItem[];
};

export type UpdateAssetCommand = {
  ticker: string;
  assetType?: AssetType;
  name?: string;
  cnpj?: string;
};

export type UpdateAssetResult =
  | { success: true; asset: AssetCatalogItem }
  | { success: false; error: string };
