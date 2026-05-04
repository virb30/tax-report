import type { Asset } from '../../domain/entities/asset.entity';

export interface AssetRepository {
  findByTicker(ticker: string): Promise<Asset | null>;
  findByTickersList(tickers: string[]): Promise<Asset[]>;
  findAll(): Promise<Asset[]>;
  save(asset: Asset): Promise<void>;
}
