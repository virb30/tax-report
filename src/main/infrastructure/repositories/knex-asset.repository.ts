import type { Knex } from 'knex';
import type { AssetRepository } from '../../application/repositories/asset.repository';
import { Asset } from '../../domain/portfolio/entities/asset.entity';
import { Cnpj } from '../../domain/shared/cnpj.vo';

type AssetRow = {
  ticker: string;
  cnpj: string;
  name: string | null;
};

function mapRowToAsset(row: AssetRow): Asset {
  return Asset.create({
    ticker: row.ticker,
    issuerCnpj: new Cnpj(row.cnpj),
    name: row.name ?? undefined,
  });
}

export class KnexAssetRepository implements AssetRepository {
  constructor(private readonly database: Knex) {}

  async findByTickersList(tickers: string[]): Promise<Asset[]> {
    const rows = await this.database<AssetRow>('ticker_data')
      .whereIn('ticker', tickers)
      .orderBy('ticker', 'asc');
    return rows.map(mapRowToAsset);
  }

  async findAll(): Promise<Asset[]> {
    const rows = await this.database<AssetRow>('ticker_data')
      .select('*')
      .orderBy('ticker', 'asc');
    return rows.map(mapRowToAsset);
  }

  async save(asset: Asset ): Promise<void> {
    await this.database('ticker_data')
      .insert({
        ticker: asset.ticker,
        cnpj: asset.issuerCnpj,
        name: asset.name ?? null,
      })
      .onConflict('ticker')
      .merge({
        cnpj: asset.issuerCnpj,
        name: asset.name ?? null,
      });
  }
}
