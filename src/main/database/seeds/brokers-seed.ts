import type { Knex } from 'knex';

const KNOWN_BROKERS = [
  { id: 'broker-xp', name: 'XP Investimentos', cnpj: '02.332.886/0001-04' },
  { id: 'broker-clear', name: 'Clear Corretora', cnpj: '02.332.886/0011-78' },
  { id: 'broker-inter', name: 'Inter DTVM', cnpj: '19.180.679/0001-92' },
  { id: 'broker-rico', name: 'Rico Investimentos', cnpj: '13.434.335/0001-60' },
];

export const brokersSeed = {
  name: '002-brokers-seed',
  async seed(knex: Knex): Promise<void> {
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
};
