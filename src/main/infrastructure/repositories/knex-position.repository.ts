import type { Knex } from 'knex';
import type { AssetPositionRepository } from '../../application/repositories/asset-position.repository';
import {
  AssetPosition,
  type BrokerAllocation,
} from '../../domain/portfolio/entities/asset-position.entity';
import type { AssetType } from '../../../shared/types/domain';
import { Uuid } from '../../domain/shared/uuid.vo';

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

type PositionKey = [string, number];

const ALLOCATION_INSERT_CHUNK_SIZE = 500;

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

function postitionToPersistence(position: AssetPosition): PositionRow {
  const averagePriceCents = Math.round(position.averagePrice * 100);
  return {
    ticker: position.ticker,
    year: position.year,
    asset_type: toAssetTypeColumn(position.assetType),
    total_quantity: position.totalQuantity,
    average_price: position.averagePrice,
    average_price_cents: averagePriceCents,
  };
}

function brokerBreakdownToPersistence(position: AssetPosition): AllocationRow[] {
  return position.brokerBreakdown.map((allocation) => ({
    position_ticker: position.ticker,
    position_year: position.year,
    broker_id: allocation.brokerId.value,
    quantity: allocation.quantity,
  }));
}

export class KnexPositionRepository implements AssetPositionRepository {
  constructor(private readonly database: Knex) {}

  async findByTickerAndYear(ticker: string, year: number): Promise<AssetPosition | null> {
    const row = await this.database<PositionRow>('positions').where({ ticker, year }).first();

    if (!row) {
      return null;
    }

    const allocations = await this.database<AllocationRow>('position_broker_allocations')
      .where({ position_ticker: ticker, position_year: year })
      .select('broker_id', 'quantity');

    const brokerBreakdown: BrokerAllocation[] = allocations.map((a) => ({
      brokerId: Uuid.from(a.broker_id),
      quantity: a.quantity,
    }));

    return AssetPosition.restore({
      ticker: row.ticker,
      assetType: toAssetType(row.asset_type),
      year: row.year,
      totalQuantity: row.total_quantity,
      averagePrice: row.average_price,
      brokerBreakdown,
    });
  }

  async findAllByYear(year: number): Promise<AssetPosition[]> {
    const rows = await this.database<PositionRow>('positions')
      .where({ year })
      .select('*')
      .orderBy('ticker', 'asc');

    const allocations = await this.database<AllocationRow>('position_broker_allocations')
      .whereIn(
        'position_ticker',
        rows.map((r) => r.ticker),
      )
      .where('position_year', year)
      .select('position_ticker', 'broker_id', 'quantity');

    const allocationsByTicker = new Map<string, BrokerAllocation[]>();

    allocations.forEach((a) => {
      const allocations = allocationsByTicker.get(a.position_ticker) ?? [];
      allocationsByTicker.set(a.position_ticker, [
        ...allocations,
        {
          brokerId: Uuid.from(a.broker_id),
          quantity: a.quantity,
        },
      ]);
    });

    return rows.map((row) => {
      return AssetPosition.restore({
        ticker: row.ticker,
        assetType: toAssetType(row.asset_type),
        year: row.year,
        totalQuantity: row.total_quantity,
        averagePrice: row.average_price,
        brokerBreakdown: allocationsByTicker.get(row.ticker) ?? [],
      });
    });
  }

  async save(position: AssetPosition): Promise<void> {
    await this.database.transaction(async (trx) => {
      await this.upsertPositions(trx, [postitionToPersistence(position)]);
      await this.replaceAllocations(trx, brokerBreakdownToPersistence(position), [
        [position.ticker, position.year],
      ]);
    });
  }

  async saveMany(positions: AssetPosition[]): Promise<void> {
    if (positions.length === 0) return;

    await this.database.transaction(async (trx) => {
      const positionRows = positions.map((p) => postitionToPersistence(p));
      const positionPairs = positions.map((p) => [p.ticker, p.year] as PositionKey);
      const allocationRows = positions.flatMap((p) => brokerBreakdownToPersistence(p));

      await this.upsertPositions(trx, positionRows);
      await this.replaceAllocations(trx, allocationRows, positionPairs);
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

  private async upsertPositions(trx: Knex.Transaction, rows: PositionRow[]): Promise<void> {
    await trx('positions')
      .insert(rows)
      .onConflict(['ticker', 'year'])
      .merge(['asset_type', 'total_quantity', 'average_price', 'average_price_cents']);
  }

  private async replaceAllocations(
    trx: Knex.Transaction,
    rows: AllocationRow[],
    positionKeys: PositionKey[],
  ): Promise<void> {
    for (const [ticker, year] of positionKeys) {
      await trx('position_broker_allocations')
        .where({ position_ticker: ticker, position_year: year })
        .delete();
    }

    if (rows.length === 0) {
      return;
    }

    for (let i = 0; i < rows.length; i += ALLOCATION_INSERT_CHUNK_SIZE) {
      await trx('position_broker_allocations').insert(
        rows.slice(i, i + ALLOCATION_INSERT_CHUNK_SIZE),
      );
    }
  }
}
