import type { Knex } from 'knex';

export const addImportIdempotencyToOperationsMigration = {
  name: '005-add-import-idempotency-to-operations',
  async up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('operations', (table) => {
      table.text('external_ref').nullable();
      table.text('import_batch_id').nullable();
      table.index(['import_batch_id'], 'idx_operations_import_batch_id');
      table.unique(['external_ref'], {
        indexName: 'uq_operations_external_ref',
      });
    });
  },
  async down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('operations', (table) => {
      table.dropUnique(['external_ref'], 'uq_operations_external_ref');
      table.dropIndex(['import_batch_id'], 'idx_operations_import_batch_id');
      table.dropColumn('import_batch_id');
      table.dropColumn('external_ref');
    });
  },
};
