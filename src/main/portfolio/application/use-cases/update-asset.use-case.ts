import { AssetTypeSource } from '../../../../shared/types/domain';
import type { AssetType } from '../../../../shared/types/domain';
import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';
import type { AssetRepository } from '../repositories/asset.repository';

export interface UpdateAssetInput {
  ticker: string;
  assetType?: AssetType;
  name?: string;
  cnpj?: string;
}

export interface UpdateAssetOutput {
  ticker: string;
  assetType: AssetType | null;
  resolutionSource: AssetTypeSource | null;
  name: string | null;
  cnpj: string | null;
  isReportReadyMetadata: boolean;
}

export class UpdateAssetUseCase {
  constructor(private readonly assetRepository: AssetRepository) {}

  async execute(input: UpdateAssetInput): Promise<UpdateAssetOutput> {
    if (input.assetType === undefined && input.name === undefined && input.cnpj === undefined) {
      throw new Error('Nenhum campo para atualizar foi informado.');
    }

    const asset = await this.assetRepository.findByTicker(input.ticker);
    if (!asset) {
      throw new Error('Ativo nao encontrado.');
    }

    if (input.name !== undefined) {
      asset.changeName(input.name);
    }

    if (input.cnpj !== undefined) {
      asset.changeIssuerCnpj(new Cnpj(input.cnpj));
    }

    if (input.assetType !== undefined) {
      asset.changeAssetType(input.assetType, AssetTypeSource.Manual);
    }

    await this.assetRepository.save(asset);

    return {
      ticker: asset.ticker,
      assetType: asset.assetType,
      resolutionSource: asset.resolutionSource,
      name: asset.name,
      cnpj: asset.issuerCnpj,
      isReportReadyMetadata: asset.name !== null && asset.issuerCnpj !== null,
    };
  }
}
