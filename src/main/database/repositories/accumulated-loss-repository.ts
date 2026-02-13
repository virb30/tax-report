import type { Knex } from 'knex';
import { type AccumulatedLoss, type AssetType } from '../../../shared/types/domain';

type AccumulatedLossRow = {
  id: number;
  asset_type: AssetType;
  amount: number;
  updated_at: string;
};

export type AccumulatedLossCreateInput = {
  assetType: AssetType;
  amount: number;
};

export type AccumulatedLossUpdateInput = {
  amount: number;
};

function mapAccumulatedLossRow(row: AccumulatedLossRow): AccumulatedLoss {
  return {
    id: row.id,
    assetType: row.asset_type,
    amount: row.amount,
    updatedAt: row.updated_at,
  };
}

export class AccumulatedLossRepository {
  constructor(private readonly database: Knex) {}

  async create(input: AccumulatedLossCreateInput): Promise<AccumulatedLoss> {
    const existingLoss = await this.findByAssetType(input.assetType);
    if (existingLoss) {
      throw new Error('Accumulated loss already exists for asset type.');
    }

    const [id] = await this.database('accumulated_losses').insert({
      asset_type: input.assetType,
      amount: input.amount,
    });

    const accumulatedLoss = await this.findById(Number(id));
    if (!accumulatedLoss) {
      throw new Error('Created accumulated loss was not found.');
    }

    return accumulatedLoss;
  }

  async findById(id: number): Promise<AccumulatedLoss | null> {
    const row = await this.database<AccumulatedLossRow>('accumulated_losses').where({ id }).first();
    return row ? mapAccumulatedLossRow(row) : null;
  }

  async findByAssetType(assetType: AssetType): Promise<AccumulatedLoss | null> {
    const row = await this.database<AccumulatedLossRow>('accumulated_losses')
      .where({ asset_type: assetType })
      .first();

    return row ? mapAccumulatedLossRow(row) : null;
  }

  async findAll(): Promise<AccumulatedLoss[]> {
    const rows = await this.database<AccumulatedLossRow>('accumulated_losses')
      .select('*')
      .orderBy('id', 'asc');

    return rows.map(mapAccumulatedLossRow);
  }

  async update(id: number, input: AccumulatedLossUpdateInput): Promise<AccumulatedLoss | null> {
    const affectedRows = await this.database('accumulated_losses')
      .where({ id })
      .update({
        amount: input.amount,
        updated_at: this.database.raw("datetime('now')"),
      });

    if (affectedRows === 0) {
      return null;
    }

    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const affectedRows = await this.database('accumulated_losses').where({ id }).delete();
    return affectedRows > 0;
  }
}
