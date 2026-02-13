import type { Knex } from 'knex';
import { type AssetType, type TaxConfig } from '../../../shared/types/domain';

type TaxConfigRow = {
  id: number;
  asset_type: AssetType;
  tax_rate: number;
  monthly_exemption_limit: number;
  irrf_rate: number;
};

export type TaxConfigCreateInput = {
  assetType: AssetType;
  taxRate: number;
  monthlyExemptionLimit: number;
  irrfRate: number;
};

export type TaxConfigUpdateInput = Partial<Omit<TaxConfigCreateInput, 'assetType'>>;

function mapTaxConfigRow(row: TaxConfigRow): TaxConfig {
  return {
    id: row.id,
    assetType: row.asset_type,
    taxRate: row.tax_rate,
    monthlyExemptionLimit: row.monthly_exemption_limit,
    irrfRate: row.irrf_rate,
  };
}

export class TaxConfigRepository {
  constructor(private readonly database: Knex) {}

  async create(input: TaxConfigCreateInput): Promise<TaxConfig> {
    const [id] = await this.database('tax_config').insert({
      asset_type: input.assetType,
      tax_rate: input.taxRate,
      monthly_exemption_limit: input.monthlyExemptionLimit,
      irrf_rate: input.irrfRate,
    });

    const taxConfig = await this.findById(Number(id));
    if (!taxConfig) {
      throw new Error('Created tax config was not found.');
    }

    return taxConfig;
  }

  async findById(id: number): Promise<TaxConfig | null> {
    const row = await this.database<TaxConfigRow>('tax_config').where({ id }).first();
    return row ? mapTaxConfigRow(row) : null;
  }

  async findByAssetType(assetType: AssetType): Promise<TaxConfig | null> {
    const row = await this.database<TaxConfigRow>('tax_config').where({ asset_type: assetType }).first();
    return row ? mapTaxConfigRow(row) : null;
  }

  async findAll(): Promise<TaxConfig[]> {
    const rows = await this.database<TaxConfigRow>('tax_config').select('*').orderBy('id', 'asc');
    return rows.map(mapTaxConfigRow);
  }

  async update(id: number, input: TaxConfigUpdateInput): Promise<TaxConfig | null> {
    const updatePayload: Record<string, unknown> = {};

    if (input.taxRate !== undefined) {
      updatePayload.tax_rate = input.taxRate;
    }

    if (input.monthlyExemptionLimit !== undefined) {
      updatePayload.monthly_exemption_limit = input.monthlyExemptionLimit;
    }

    if (input.irrfRate !== undefined) {
      updatePayload.irrf_rate = input.irrfRate;
    }

    const affectedRows = await this.database('tax_config').where({ id }).update(updatePayload);
    if (affectedRows === 0) {
      return null;
    }

    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const affectedRows = await this.database('tax_config').where({ id }).delete();
    return affectedRows > 0;
  }
}
