import type { PortfolioPositionRepositoryPort } from '../../application/repositories/portfolio-position.repository.interface';
import type { AssetPositionSnapshot } from '../../domain/portfolio/asset-position';
import type { Asset } from '../../../shared/types/domain';
import type { AssetRepository } from '../../database/repositories/asset-repository';

function mapAssetToSnapshot(asset: Asset): AssetPositionSnapshot {
  return {
    ticker: asset.ticker,
    broker: asset.broker,
    assetType: asset.assetType,
    quantity: asset.quantity,
    averagePrice: asset.averagePrice,
    isManualBase: asset.isManualBase,
  };
}

export class SqlitePortfolioPositionRepository implements PortfolioPositionRepositoryPort {
  constructor(private readonly assetRepository: AssetRepository) {}

  async findByTickerAndBroker(input: {
    ticker: string;
    broker: string;
  }): Promise<AssetPositionSnapshot | null> {
    const asset = await this.assetRepository.findByTickerAndBroker(input.ticker, input.broker);
    if (!asset) {
      return null;
    }

    return mapAssetToSnapshot(asset);
  }

  async findAll(): Promise<AssetPositionSnapshot[]> {
    const assets = await this.assetRepository.findAll();
    return assets.map(mapAssetToSnapshot);
  }

  async save(snapshot: AssetPositionSnapshot): Promise<void> {
    const existingAsset = await this.assetRepository.findByTickerAndBroker(
      snapshot.ticker,
      snapshot.broker,
    );
    if (existingAsset) {
      await this.assetRepository.update(existingAsset.id, {
        assetType: snapshot.assetType,
        quantity: snapshot.quantity,
        averagePrice: snapshot.averagePrice,
        isManualBase: snapshot.isManualBase,
      });
      return;
    }

    await this.assetRepository.create({
      ticker: snapshot.ticker,
      broker: snapshot.broker,
      assetType: snapshot.assetType,
      quantity: snapshot.quantity,
      averagePrice: snapshot.averagePrice,
      isManualBase: snapshot.isManualBase,
      name: null,
      cnpj: null,
    });
  }
}
