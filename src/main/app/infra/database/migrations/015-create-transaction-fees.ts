import type { Knex } from 'knex';

export const createTransactionFeesMigration = {
  name: '015-create-transaction-fees',
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('transaction_fees', (table) => {
      table
        .text('transaction_id')
        .primary()
        .references('id')
        .inTable('transactions')
        .onDelete('CASCADE');
      table.text('total_fees').notNullable().defaultTo('0');
      table.text('created_at').notNullable().defaultTo(knex.fn.now());
      table.text('updated_at').notNullable().defaultTo(knex.fn.now());
    });

    await knex('transaction_fees').insert(
      knex('transactions').select({
        transaction_id: 'id',
        total_fees: 'fees',
        created_at: 'created_at',
        updated_at: knex.fn.now(),
      }),
    );

    await knex.schema.alterTable('transactions', (table) => {
      table.dropColumn('fees');
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('transactions', (table) => {
      table.text('fees').notNullable().defaultTo('0');
    });

    await knex('transactions').update({
      fees: knex.raw(
        `COALESCE(
          (
            SELECT total_fees
            FROM transaction_fees
            WHERE transaction_fees.transaction_id = transactions.id
          ),
          ?
        )`,
        ['0'],
      ),
    });

    await knex.schema.dropTableIfExists('transaction_fees');
  },
};
