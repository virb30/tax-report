import type { AssetPosition } from '../../domain/portfolio/asset-position.entity';

export interface PositionRepository {
  findByTickerAndYear(ticker: string, year: number): Promise<AssetPosition | null>;
  findAllByYear(year: number): Promise<AssetPosition[]>;
  save(position: AssetPosition): Promise<void>;
  delete(ticker: string, year: number): Promise<void>;
}
