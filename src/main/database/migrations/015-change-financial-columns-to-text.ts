import type { Knex } from 'knex';
import type { DatabaseMigration } from './index';

export const changeFinancialColumnsToTextMigration: DatabaseMigration = {
  name: '015-change-financial-columns-to-text',
  up: async (knex: Knex) => {
    // SQLite doesn't support direct type change via ALTER TABLE.
    // Knex will try to handle it if possible, or we can use raw SQL if needed.
    // Given previous migrations used .alter(), we follow the pattern.

    await knex.schema.table('transactions', (table) => {
      table.text('unit_price').alter();
      table.text('fees').alter();
      table.text('quantity').alter();
    });

    await knex.schema.table('positions', (table) => {
      table.text('average_price').alter();
      table.text('total_quantity').alter();
    });

    await knex.schema.table('position_broker_allocations', (table) => {
      table.text('quantity').alter();
    });
  },
  down: async (knex: Knex) => {
    await knex.schema.table('transactions', (table) => {
      table.float('unit_price').alter();
      table.float('fees').alter();
      table.float('quantity').alter();
    });

    await knex.schema.table('positions', (table) => {
      table.float('average_price').alter();
      table.float('total_quantity').alter();
    });

    await knex.schema.table('position_broker_allocations', (table) => {
      table.float('quantity').alter();
    });
  },
};
