import type { Knex } from 'knex';

export const createTransactionsMigration = {
  name: '004-create-transactions',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('transactions', (table) => {
      table.text('id').primary();
      table.text('date').notNullable();
      table
        .text('type')
        .notNullable()
        .checkIn(['buy', 'sell', 'bonus', 'initial_balance']);
      table.text('ticker').notNullable();
      table.float('quantity').notNullable();
      table.float('unit_price').notNullable().defaultTo(0);
      table.integer('unit_price_cents').notNullable().defaultTo(0);
      table.float('fees').notNullable().defaultTo(0);
      table.integer('fees_cents').notNullable().defaultTo(0);
      table.text('broker_id').notNullable().references('id').inTable('brokers');
      table
        .text('source_type')
        .notNullable()
        .checkIn(['pdf', 'csv', 'manual']);
      table.text('external_ref').unique().nullable();
      table.text('import_batch_id').nullable();
      table.text('created_at').notNullable().defaultTo(knex.fn.now());
      table.index(['ticker']);
      table.index(['date']);
      table.index(['type', 'date']);
      table.index(['import_batch_id']);
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('transactions');
  },
};
