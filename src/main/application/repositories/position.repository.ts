import type { AssetPositionSnapshot } from '../../domain/portfolio/asset-position.entity';

export interface PositionRepository {
  findByTicker(ticker: string): Promise<AssetPositionSnapshot | null>;
  findAll(): Promise<AssetPositionSnapshot[]>;
  save(snapshot: AssetPositionSnapshot): Promise<void>;
}
