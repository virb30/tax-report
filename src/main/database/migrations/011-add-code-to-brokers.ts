import type { Knex } from 'knex';

const CODE_MAP: Record<string, string> = {
  '02.332.886/0001-04': 'XP',
  '02.332.886/0011-78': 'CLEAR',
  '19.180.679/0001-92': 'INTER',
  '13.434.335/0001-60': 'RICO',
  '62.169.875/0001-79': 'NU',
};

export const addCodeToBrokersMigration = {
  name: '011-add-code-to-brokers',
  async up(knex: Knex): Promise<void> {
    const hasCode = await knex.schema.hasColumn('brokers', 'code');
    if (hasCode) {
      return;
    }

    await knex.schema.alterTable('brokers', (table) => {
      table.text('code').defaultTo('');
    });

    const brokers = await knex('brokers').select('id', 'name', 'cnpj');
    for (const broker of brokers) {
      const code = CODE_MAP[broker.cnpj as string] ?? `BRK-${(broker.id as string).slice(-8)}`;
      await knex('brokers').where({ id: broker.id }).update({ code });
    }

    await knex.schema.raw(
      'CREATE UNIQUE INDEX IF NOT EXISTS brokers_code_unique ON brokers(code)',
    );
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.raw('DROP INDEX IF EXISTS brokers_code_unique');
    const hasCode = await knex.schema.hasColumn('brokers', 'code');
    if (!hasCode) {
      return;
    }
    await knex.schema.alterTable('brokers', (table) => {
      table.dropColumn('code');
    });
  },
};
