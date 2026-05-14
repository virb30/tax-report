import type { Knex } from 'knex';

export const createPositionBrokerAllocationsMigration = {
  name: '003-create-position-broker-allocations',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('position_broker_allocations', (table) => {
      table.increments('id').primary();
      table.text('position_ticker').notNullable().references('ticker').inTable('positions');
      table.text('broker_id').notNullable().references('id').inTable('brokers');
      table.text('quantity').notNullable().defaultTo('0');
      table.unique(['position_ticker', 'broker_id']);
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('position_broker_allocations');
  },
};
