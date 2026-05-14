import type { AssetType, AssetTypeSource } from '../../../shared/types/domain';
import type { Asset } from '../../domain/entities/asset.entity';
import type { AssetRepository } from '../repositories/asset.repository';

export interface ListAssetsInput {
  pendingOnly?: boolean;
  reportBlockingOnly?: boolean;
}

export interface AssetCatalogOutput {
  ticker: string;
  assetType: AssetType | null;
  resolutionSource: AssetTypeSource | null;
  name: string | null;
  cnpj: string | null;
  isReportReadyMetadata: boolean;
}

export interface ListAssetsOutput {
  items: AssetCatalogOutput[];
}

export class ListAssetsUseCase {
  constructor(private readonly assetRepository: AssetRepository) {}

  async execute(query?: ListAssetsInput): Promise<ListAssetsOutput> {
    const assets = await this.assetRepository.findAll();

    return {
      items: assets
        .map((asset) => this.toOutput(asset))
        .filter((asset) => !query?.pendingOnly || this.hasPendingMetadata(asset))
        .filter((asset) => !query?.reportBlockingOnly || !asset.isReportReadyMetadata),
    };
  }

  private toOutput(asset: Asset): AssetCatalogOutput {
    return {
      ticker: asset.ticker,
      assetType: asset.assetType,
      resolutionSource: asset.resolutionSource,
      name: asset.name,
      cnpj: asset.issuerCnpj,
      isReportReadyMetadata: asset.name !== null && asset.issuerCnpj !== null,
    };
  }

  private hasPendingMetadata(asset: AssetCatalogOutput): boolean {
    return asset.assetType === null || !asset.isReportReadyMetadata;
  }
}
