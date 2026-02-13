import type { AssetPositionSnapshot } from '@main/domain/portfolio/asset-position';

export interface PortfolioPositionRepositoryPort {
  findByTickerAndBroker(input: { ticker: string; broker: string }): Promise<AssetPositionSnapshot | null>;
  save(snapshot: AssetPositionSnapshot): Promise<void>;
}