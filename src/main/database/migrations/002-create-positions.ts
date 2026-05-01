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
      table.text('total_quantity').notNullable().defaultTo('0');
      table.text('average_price').notNullable().defaultTo('0');
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('positions');
  },
};
