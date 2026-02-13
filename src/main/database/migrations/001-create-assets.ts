import type { Knex } from 'knex';

export const createAssetsMigration = {
  name: '001-create-assets',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('assets', (table) => {
      table.increments('id').primary();
      table.text('ticker').notNullable();
      table.text('name').nullable();
      table.text('cnpj').nullable();
      table
        .text('asset_type')
        .notNullable()
        .checkIn(['stock', 'fii', 'etf', 'bdr']);
      table.text('broker').notNullable();
      table.float('average_price').notNullable();
      table.integer('quantity').notNullable();
      table.boolean('is_manual_base').notNullable().defaultTo(false);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
      table.unique(['ticker', 'broker']);
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('assets');
  },
};
