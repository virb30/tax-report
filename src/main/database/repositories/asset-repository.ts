import type { Knex } from 'knex';
import { type Asset, type AssetType } from '../../../shared/types/domain';

type AssetRow = {
  id: number;
  ticker: string;
  name: string | null;
  cnpj: string | null;
  asset_type: AssetType;
  broker: string;
  average_price: number;
  quantity: number;
  is_manual_base: number;
  created_at: string;
  updated_at: string;
};

export type AssetCreateInput = {
  ticker: string;
  name: string | null;
  cnpj: string | null;
  assetType: AssetType;
  broker: string;
  averagePrice: number;
  quantity: number;
  isManualBase: boolean;
};

export type AssetUpdateInput = Partial<Omit<AssetCreateInput, 'ticker' | 'broker'>>;

function mapAssetRow(row: AssetRow): Asset {
  return {
    id: row.id,
    ticker: row.ticker,
    name: row.name,
    cnpj: row.cnpj,
    assetType: row.asset_type,
    broker: row.broker,
    averagePrice: row.average_price,
    quantity: row.quantity,
    isManualBase: Boolean(row.is_manual_base),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AssetRepository {
  constructor(private readonly database: Knex) {}

  async create(input: AssetCreateInput): Promise<Asset> {
    const existingAsset = await this.findByTickerAndBroker(input.ticker, input.broker);
    if (existingAsset) {
      throw new Error('Asset already exists for ticker and broker.');
    }

    const [id] = await this.database('assets').insert({
      ticker: input.ticker,
      name: input.name,
      cnpj: input.cnpj,
      asset_type: input.assetType,
      broker: input.broker,
      average_price: input.averagePrice,
      quantity: input.quantity,
      is_manual_base: input.isManualBase ? 1 : 0,
    });

    const asset = await this.findById(Number(id));
    if (!asset) {
      throw new Error('Created asset was not found.');
    }

    return asset;
  }

  async findById(id: number): Promise<Asset | null> {
    const row = await this.database<AssetRow>('assets').where({ id }).first();
    return row ? mapAssetRow(row) : null;
  }

  async findByTickerAndBroker(ticker: string, broker: string): Promise<Asset | null> {
    const row = await this.database<AssetRow>('assets').where({ ticker, broker }).first();
    return row ? mapAssetRow(row) : null;
  }

  async findAll(): Promise<Asset[]> {
    const rows = await this.database<AssetRow>('assets').select('*').orderBy('id', 'asc');
    return rows.map(mapAssetRow);
  }

  async update(id: number, input: AssetUpdateInput): Promise<Asset | null> {
    const updatePayload: Record<string, unknown> = {
      updated_at: this.database.raw("datetime('now')"),
    };

    if (input.name !== undefined) {
      updatePayload.name = input.name;
    }

    if (input.cnpj !== undefined) {
      updatePayload.cnpj = input.cnpj;
    }

    if (input.assetType !== undefined) {
      updatePayload.asset_type = input.assetType;
    }

    if (input.averagePrice !== undefined) {
      updatePayload.average_price = input.averagePrice;
    }

    if (input.quantity !== undefined) {
      updatePayload.quantity = input.quantity;
    }

    if (input.isManualBase !== undefined) {
      updatePayload.is_manual_base = input.isManualBase ? 1 : 0;
    }

    const affectedRows = await this.database('assets').where({ id }).update(updatePayload);
    if (affectedRows === 0) {
      return null;
    }

    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const affectedRows = await this.database('assets').where({ id }).delete();
    return affectedRows > 0;
  }
}
