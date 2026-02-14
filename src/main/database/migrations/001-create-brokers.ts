import type { Knex } from 'knex';

export const createBrokersMigration = {
  name: '001-create-brokers',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('brokers', (table) => {
      table.text('id').primary();
      table.text('name').notNullable();
      table.text('cnpj').notNullable().unique();
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('brokers');
  },
};
