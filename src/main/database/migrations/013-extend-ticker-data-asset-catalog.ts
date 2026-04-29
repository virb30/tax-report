import type { Knex } from 'knex';

export const extendTickerDataAssetCatalogMigration = {
  name: '013-extend-ticker-data-asset-catalog',
  async up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('ticker_data', (table) => {
      table.text('asset_type').nullable();
      table.text('resolution_source').nullable();
      table.text('cnpj').nullable().alter();
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('ticker_data', (table) => {
      table.dropColumn('resolution_source');
      table.dropColumn('asset_type');
      table.text('cnpj').notNullable().alter();
    });
  },
};
