import type { Knex } from 'knex';

export const createPositionsMigration = {
  name: '002-create-positions',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('positions', (table) => {
      table.text('ticker').primary();
      table
        .text('asset_type')
        .notNullable()
        .checkIn(['stock', 'fii', 'etf', 'bdr']);
      table.float('total_quantity').notNullable().defaultTo(0);
      table.float('average_price').notNullable().defaultTo(0);
      table.integer('average_price_cents').notNullable().defaultTo(0);
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('positions');
  },
};
