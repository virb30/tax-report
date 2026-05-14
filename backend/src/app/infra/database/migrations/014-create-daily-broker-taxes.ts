import type { Knex } from 'knex';

export const createDailyBrokerTaxesMigration = {
  name: '014-create-daily-broker-taxes',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('daily_broker_taxes', (table) => {
      table.text('date').notNullable();
      table.text('broker_id').notNullable().references('id').inTable('brokers');
      table.text('fees').notNullable().defaultTo('0');
      table.text('irrf').notNullable().defaultTo('0');
      table.text('created_at').notNullable().defaultTo(knex.fn.now());
      table.text('updated_at').notNullable().defaultTo(knex.fn.now());
      table.primary(['date', 'broker_id']);
      table.index(['broker_id']);
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('daily_broker_taxes');
  },
};
