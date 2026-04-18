import type { Knex } from 'knex';

export const addActiveToBrokersMigration = {
  name: '012-add-active-to-brokers',
  async up(knex: Knex): Promise<void> {
    const hasActive = await knex.schema.hasColumn('brokers', 'active');
    if (hasActive) {
      return;
    }

    await knex.schema.alterTable('brokers', (table) => {
      table.integer('active').notNullable().defaultTo(1);
    });

    await knex('brokers').update({ active: 1 });
  },
  async down(knex: Knex): Promise<void> {
    const hasActive = await knex.schema.hasColumn('brokers', 'active');
    if (!hasActive) {
      return;
    }
    await knex.schema.alterTable('brokers', (table) => {
      table.dropColumn('active');
    });
  },
};
