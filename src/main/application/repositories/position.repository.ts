import type { AssetPositionSnapshot } from '../../domain/portfolio/asset-position.entity';

export interface PositionRepository {
  findByTickerAndYear(ticker: string, year: number): Promise<AssetPositionSnapshot | null>;
  findAllByYear(year: number): Promise<AssetPositionSnapshot[]>;
  save(snapshot: AssetPositionSnapshot, year: number): Promise<void>;
  delete(ticker: string, year: number): Promise<void>;
}
