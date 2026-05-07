import type { Knex } from 'knex';

export const createMonthlyTaxClosesMigration = {
  name: '016-create-monthly-tax-closes',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('monthly_tax_closes', (table) => {
      table.text('month').notNullable().primary();
      table.text('state').notNullable();
      table.text('outcome').notNullable();
      table.text('calculation_version').notNullable();
      table.text('input_fingerprint').notNullable();
      table.text('calculated_at').notNullable();
      table.text('net_tax_due').notNullable();
      table.text('carry_forward_out').notNullable();
      table.text('change_summary').nullable();
      table.text('detail_json').notNullable();
      table.text('created_at').notNullable().defaultTo(knex.fn.now());
      table.text('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('monthly_tax_closes');
  },
};
