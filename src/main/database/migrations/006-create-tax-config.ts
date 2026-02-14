import type { Knex } from 'knex';

export const createTaxConfigMigration = {
  name: '006-create-tax-config',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('tax_config', (table) => {
      table.increments('id').primary();
      table
        .text('asset_type')
        .notNullable()
        .unique()
        .checkIn(['stock', 'fii', 'etf', 'bdr']);
      table.float('tax_rate').notNullable();
      table.float('monthly_exemption_limit').notNullable().defaultTo(0);
      table.float('irrf_rate').notNullable().defaultTo(0);
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('tax_config');
  },
};
