
import type { Knex } from 'knex';
import type { DatabaseMigration } from './index';

export const removeCentsColumnsMigration: DatabaseMigration = {
  name: '014-remove-cents-columns',
  up: async (knex: Knex) => {
    await knex.schema.table('transactions', (table) => {
      table.dropColumn('unit_price_cents');
      table.dropColumn('fees_cents');
      table.text('unit_price').alter();
      table.text('fees').alter();
      table.text('quantity').alter();
    });

    await knex.schema.table('positions', (table) => {
      table.dropColumn('average_price_cents');
      table.text('average_price').alter();
      table.text('total_quantity').alter();
    });
  },
  down: async (knex: Knex) => {
    await knex.schema.table('transactions', (table) => {
      table.integer('unit_price_cents').notNullable().defaultTo(0);
      table.integer('fees_cents').notNullable().defaultTo(0);
      table.float('unit_price').alter();
      table.float('fees').alter();
      table.float('quantity').alter();
    });

    await knex.schema.table('positions', (table) => {
      table.integer('average_price_cents').notNullable().defaultTo(0);
      table.float('average_price').alter();
      table.float('total_quantity').alter();
    });
  },
};
