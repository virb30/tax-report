import type { Knex } from 'knex';

const initialTaxConfigRows = [
  {
    asset_type: 'stock',
    tax_rate: 0.15,
    monthly_exemption_limit: 20000,
    irrf_rate: 0.00005,
  },
  {
    asset_type: 'fii',
    tax_rate: 0.2,
    monthly_exemption_limit: 0,
    irrf_rate: 0.00005,
  },
  {
    asset_type: 'etf',
    tax_rate: 0.15,
    monthly_exemption_limit: 0,
    irrf_rate: 0.00005,
  },
  {
    asset_type: 'bdr',
    tax_rate: 0.15,
    monthly_exemption_limit: 0,
    irrf_rate: 0.00005,
  },
] as const;

export const createTaxConfigMigration = {
  name: '006-create-tax-config',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('tax_config', (table) => {
      table.increments('id').primary();
      table.text('asset_type').notNullable().unique().checkIn(['stock', 'fii', 'etf', 'bdr']);
      table.float('tax_rate').notNullable();
      table.float('monthly_exemption_limit').notNullable().defaultTo(0);
      table.float('irrf_rate').notNullable().defaultTo(0);
    });

    await knex('tax_config').insert(initialTaxConfigRows).onConflict('asset_type').merge();
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('tax_config');
  },
};
