import type { Knex } from 'knex';

export const createTickerDataMigration = {
  name: '009-create-ticker-data',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('ticker_data', (table) => {
      table.text('ticker').primary();
      table.text('cnpj').notNullable();
      table.text('name');
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('ticker_data');
  },
};
