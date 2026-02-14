import type { Knex } from 'knex';
import type { PositionRepository } from '../../application/repositories/position.repository';
import type {
  AssetPositionSnapshot,
  BrokerAllocation,
} from '../../domain/portfolio/asset-position.entity';
import type { AssetType } from '../../../shared/types/domain';

type PositionRow = {
  ticker: string;
  year: number;
  asset_type: string;
  total_quantity: number;
  average_price: number;
  average_price_cents: number;
};

type AllocationRow = {
  position_ticker: string;
  position_year: number;
  broker_id: string;
  quantity: number;
};

function toAssetType(assetType: string): AssetType {
  const map: Record<string, AssetType> = {
    stock: 'stock' as AssetType,
    fii: 'fii' as AssetType,
    etf: 'etf' as AssetType,
    bdr: 'bdr' as AssetType,
  };
  const t = map[assetType];
  if (!t) {
    throw new Error(`Unknown asset type: ${assetType}`);
  }
  return t;
}

function toAssetTypeColumn(assetType: AssetType): string {
  return assetType;
}

export class KnexPositionRepository implements PositionRepository {
  constructor(private readonly database: Knex) {}

  async findByTickerAndYear(
    ticker: string,
    year: number,
  ): Promise<AssetPositionSnapshot | null> {
    const row = await this.database<PositionRow>('positions')
      .where({ ticker, year })
      .first();

    if (!row) {
      return null;
    }

    const allocations = await this.database<AllocationRow>(
      'position_broker_allocations',
    )
      .where({ position_ticker: ticker, position_year: year })
      .select('broker_id', 'quantity');

    const brokerBreakdown: BrokerAllocation[] = allocations.map((a) => ({
      brokerId: a.broker_id,
      quantity: a.quantity,
    }));

    return {
      ticker: row.ticker,
      assetType: toAssetType(row.asset_type),
      totalQuantity: row.total_quantity,
      averagePrice: row.average_price,
      brokerBreakdown,
    };
  }

  async findAllByYear(year: number): Promise<AssetPositionSnapshot[]> {
    const rows = await this.database<PositionRow>('positions')
      .where({ year })
      .select('*')
      .orderBy('ticker', 'asc');

    const result: AssetPositionSnapshot[] = [];

    for (const row of rows) {
      const allocations = await this.database<AllocationRow>(
        'position_broker_allocations',
      )
        .where({ position_ticker: row.ticker, position_year: row.year })
        .select('broker_id', 'quantity');

      result.push({
        ticker: row.ticker,
        assetType: toAssetType(row.asset_type),
        totalQuantity: row.total_quantity,
        averagePrice: row.average_price,
        brokerBreakdown: allocations.map((a) => ({
          brokerId: a.broker_id,
          quantity: a.quantity,
        })),
      });
    }

    return result;
  }

  async save(snapshot: AssetPositionSnapshot, year: number): Promise<void> {
    await this.database.transaction(async (trx) => {
      const averagePriceCents = Math.round(snapshot.averagePrice * 100);

      await trx('positions')
        .insert({
          ticker: snapshot.ticker,
          year,
          asset_type: toAssetTypeColumn(snapshot.assetType),
          total_quantity: snapshot.totalQuantity,
          average_price: snapshot.averagePrice,
          average_price_cents: averagePriceCents,
        })
        .onConflict(['ticker', 'year'])
        .merge({
          asset_type: toAssetTypeColumn(snapshot.assetType),
          total_quantity: snapshot.totalQuantity,
          average_price: snapshot.averagePrice,
          average_price_cents: averagePriceCents,
        });

      await trx('position_broker_allocations')
        .where({ position_ticker: snapshot.ticker, position_year: year })
        .delete();

      if (snapshot.brokerBreakdown.length > 0) {
        await trx('position_broker_allocations').insert(
          snapshot.brokerBreakdown.map((a) => ({
            position_ticker: snapshot.ticker,
            position_year: year,
            broker_id: a.brokerId,
            quantity: a.quantity,
          })),
        );
      }
    });
  }

  async delete(ticker: string, year: number): Promise<void> {
    await this.database.transaction(async (trx) => {
      await trx('position_broker_allocations')
        .where({ position_ticker: ticker, position_year: year })
        .delete();
      await trx('positions').where({ ticker, year }).delete();
    });
  }
}
