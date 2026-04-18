import type { AssetPosition } from '../../domain/portfolio/entities/asset-position.entity';

export interface AssetPositionRepository {
  findByTickerAndYear(ticker: string, year: number): Promise<AssetPosition | null>;
  findAllByYear(year: number): Promise<AssetPosition[]>;
  save(position: AssetPosition): Promise<void>;
  saveMany(positions: AssetPosition[]): Promise<void>;
  delete(ticker: string, year: number): Promise<void>;
}
