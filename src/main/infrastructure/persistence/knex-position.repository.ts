import type { Knex } from 'knex';
import type { PositionRepository } from '../../application/repositories/position.repository';
import type {
  AssetPositionSnapshot,
  BrokerAllocation,
} from '../../domain/portfolio/asset-position.entity';
import type { AssetType } from '../../../shared/types/domain';

type PositionRow = {
  ticker: string;
  asset_type: string;
  total_quantity: number;
  average_price: number;
  average_price_cents: number;
};

type AllocationRow = {
  position_ticker: string;
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

  async findByTicker(ticker: string): Promise<AssetPositionSnapshot | null> {
    const row = await this.database<PositionRow>('positions')
      .where({ ticker })
      .first();

    if (!row) {
      return null;
    }

    const allocations = await this.database<AllocationRow>(
      'position_broker_allocations',
    )
      .where({ position_ticker: ticker })
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

  async findAll(): Promise<AssetPositionSnapshot[]> {
    const rows = await this.database<PositionRow>('positions')
      .select('*')
      .orderBy('ticker', 'asc');

    const result: AssetPositionSnapshot[] = [];

    for (const row of rows) {
      const allocations = await this.database<AllocationRow>(
        'position_broker_allocations',
      )
        .where({ position_ticker: row.ticker })
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

  async save(snapshot: AssetPositionSnapshot): Promise<void> {
    await this.database.transaction(async (trx) => {
      const averagePriceCents = Math.round(snapshot.averagePrice * 100);

      await trx('positions')
        .insert({
          ticker: snapshot.ticker,
          asset_type: toAssetTypeColumn(snapshot.assetType),
          total_quantity: snapshot.totalQuantity,
          average_price: snapshot.averagePrice,
          average_price_cents: averagePriceCents,
        })
        .onConflict('ticker')
        .merge({
          asset_type: toAssetTypeColumn(snapshot.assetType),
          total_quantity: snapshot.totalQuantity,
          average_price: snapshot.averagePrice,
          average_price_cents: averagePriceCents,
        });

      await trx('position_broker_allocations')
        .where({ position_ticker: snapshot.ticker })
        .delete();

      if (snapshot.brokerBreakdown.length > 0) {
        await trx('position_broker_allocations').insert(
          snapshot.brokerBreakdown.map((a) => ({
            position_ticker: snapshot.ticker,
            broker_id: a.brokerId,
            quantity: a.quantity,
          })),
        );
      }
    });
  }
}
