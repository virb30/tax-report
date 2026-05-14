import type { Knex } from 'knex';

export const createTransactionsMigration = {
  name: '004-create-transactions',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('transactions', (table) => {
      table.text('id').primary();
      table.text('date').notNullable();
      table.text('type').notNullable();
      table.text('ticker').notNullable();
      table.text('quantity').notNullable();
      table.text('unit_price').notNullable().defaultTo('0');
      table.text('fees').notNullable().defaultTo('0');
      table.text('broker_id').notNullable().references('id').inTable('brokers');
      table.text('source_type').notNullable().checkIn(['pdf', 'csv', 'manual']);
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
