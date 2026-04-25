import type { Asset } from "../../domain/portfolio/entities/asset.entity";

export interface AssetRepository {
  findByTickersList(tickers: string[]): Promise<Asset[]>;
  findAll(): Promise<Asset[]>;
  save(asset: Asset): Promise<void>;
}
