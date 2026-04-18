import type { Knex } from 'knex';

export const createOperationsMigration = {
  name: '008-create-operations',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('operations', (table) => {
      table.increments('id').primary();
      table.text('trade_date').notNullable();
      table
        .text('operation_type')
        .notNullable()
        .checkIn(['buy', 'sell']);
      table.text('ticker').notNullable();
      table.integer('quantity').notNullable();
      table.float('unit_price').notNullable();
      table.float('operational_costs').notNullable().defaultTo(0);
      table.float('irrf_withheld').notNullable().defaultTo(0);
      table.text('broker').notNullable();
      table
        .text('source_type')
        .notNullable()
        .checkIn(['pdf', 'csv', 'manual']);
      table.text('external_ref').nullable().unique();
      table.text('import_batch_id').nullable();
      table.timestamp('imported_at').notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.alterTable('operations', (table) => {
      table.index(['ticker'], 'idx_operations_ticker');
      table.index(['trade_date'], 'idx_operations_trade_date');
      table.index(['operation_type', 'trade_date'], 'idx_operations_type_date');
      table.index(['import_batch_id'], 'idx_operations_import_batch_id');
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('operations');
  },
};
