import type { Knex } from 'knex';
import { v7 as uuidv7 } from 'uuid';

const KNOWN_BROKERS = [
  { id: uuidv7(), name: 'XP Investimentos', cnpj: '02.332.886/0001-04' },
  { id: uuidv7(), name: 'Clear Corretora', cnpj: '02.332.886/0011-78' },
  { id: uuidv7(), name: 'Inter DTVM', cnpj: '19.180.679/0001-92' },
  { id: uuidv7(), name: 'Rico Investimentos', cnpj: '13.434.335/0001-60' },
  { id: uuidv7(), name: 'Nu Invest', cnpj: '62.169.875/0001-79' },
];

export const createBrokersMigration = {
  name: '001-create-brokers',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('brokers', (table) => {
      table.text('id').primary();
      table.text('name').notNullable();
      table.text('cnpj').notNullable().unique();
    });

    for (const broker of KNOWN_BROKERS) {
      await knex('brokers')
        .insert({
          id: broker.id,
          name: broker.name,
          cnpj: broker.cnpj,
        })
        .onConflict('id')
        .ignore();
    }
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('brokers');
  },
};
