import type { Knex } from 'knex';

export const createAccumulatedLossesMigration = {
  name: '005-create-accumulated-losses',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('accumulated_losses', (table) => {
      table.increments('id').primary();
      table
        .text('asset_type')
        .notNullable()
        .unique()
        .checkIn(['stock', 'fii', 'etf', 'bdr']);
      table.float('amount').notNullable().defaultTo(0);
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('accumulated_losses');
  },
};
