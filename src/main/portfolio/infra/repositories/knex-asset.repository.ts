import type { Knex } from 'knex';
import type { AssetType, AssetTypeSource } from '../../../shared/types/domain';
import type { AssetRepository } from '../../application/repositories/asset.repository';
import { Asset } from '../../domain/entities/asset.entity';
import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';

type AssetRow = {
  ticker: string;
  asset_type: AssetType | null;
  resolution_source: AssetTypeSource | null;
  cnpj: string | null;
  name: string | null;
};

function mapRowToAsset(row: AssetRow): Asset {
  return Asset.create({
    ticker: row.ticker,
    issuerCnpj: row.cnpj ? new Cnpj(row.cnpj) : undefined,
    name: row.name ?? undefined,
    assetType: row.asset_type ?? undefined,
    resolutionSource: row.resolution_source ?? undefined,
  });
}

export class KnexAssetRepository implements AssetRepository {
  constructor(private readonly database: Knex) {}

  async findByTicker(ticker: string): Promise<Asset | null> {
    const row = await this.database<AssetRow>('ticker_data').where({ ticker }).first();
    return row ? mapRowToAsset(row) : null;
  }

  async findByTickersList(tickers: string[]): Promise<Asset[]> {
    if (tickers.length === 0) {
      return [];
    }

    const rows = await this.database<AssetRow>('ticker_data')
      .whereIn('ticker', tickers)
      .orderBy('ticker', 'asc');
    return rows.map(mapRowToAsset);
  }

  async findAll(): Promise<Asset[]> {
    const rows = await this.database<AssetRow>('ticker_data').select('*').orderBy('ticker', 'asc');
    return rows.map(mapRowToAsset);
  }

  async save(asset: Asset): Promise<void> {
    await this.database('ticker_data')
      .insert({
        ticker: asset.ticker,
        cnpj: asset.issuerCnpj,
        name: asset.name,
        asset_type: asset.assetType,
        resolution_source: asset.resolutionSource,
      })
      .onConflict('ticker')
      .merge({
        cnpj: asset.issuerCnpj,
        name: asset.name,
        asset_type: asset.assetType,
        resolution_source: asset.resolutionSource,
      });
  }
}
