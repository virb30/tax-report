import type { Knex } from 'knex';

/** Ano-base padrão para posições existentes na migração (ano anterior). */
const DEFAULT_MIGRATION_YEAR = new Date().getFullYear() - 1;

export const addYearToPositionsMigration = {
  name: '010-add-year-to-positions',
  async up(knex: Knex): Promise<void> {
    const defaultYear = DEFAULT_MIGRATION_YEAR;

    const hasPositions = await knex.schema.hasTable('positions');
    if (!hasPositions) {
      return;
    }

    const hasAllocations = await knex.schema.hasTable('position_broker_allocations');
    let allocationsBackup: Array<{ position_ticker: string; broker_id: string; quantity: number }> =
      [];
    if (hasAllocations) {
      allocationsBackup = await knex('position_broker_allocations').select(
        'position_ticker',
        'broker_id',
        'quantity',
      );
      await knex.schema.dropTableIfExists('position_broker_allocations');
    }

    await knex.schema.renameTable('positions', 'positions_old');

    await knex.schema.createTable('positions', (table) => {
      table.text('ticker').notNullable();
      table.integer('year').notNullable();
      table
        .text('asset_type')
        .notNullable()
        .checkIn(['stock', 'fii', 'etf', 'bdr']);
      table.float('total_quantity').notNullable().defaultTo(0);
      table.float('average_price').notNullable().defaultTo(0);
      table.integer('average_price_cents').notNullable().defaultTo(0);
      table.primary(['ticker', 'year']);
    });

    const oldRows = await knex('positions_old').select('*');
    if (oldRows.length > 0) {
      await knex('positions').insert(
        oldRows.map((row) => ({
          ticker: row.ticker,
          year: defaultYear,
          asset_type: row.asset_type,
          total_quantity: row.total_quantity,
          average_price: row.average_price,
          average_price_cents: row.average_price_cents,
        })),
      );
    }
    await knex.schema.dropTableIfExists('positions_old');

    await knex.schema.createTable('position_broker_allocations', (table) => {
      table.increments('id').primary();
      table.text('position_ticker').notNullable();
      table.integer('position_year').notNullable();
      table.text('broker_id').notNullable().references('id').inTable('brokers');
      table.float('quantity').notNullable().defaultTo(0);
      table
        .foreign(['position_ticker', 'position_year'])
        .references(['ticker', 'year'])
        .inTable('positions');
      table.unique(['position_ticker', 'position_year', 'broker_id']);
    });

    if (allocationsBackup.length > 0) {
      await knex('position_broker_allocations').insert(
        allocationsBackup.map((a) => ({
          position_ticker: a.position_ticker,
          position_year: defaultYear,
          broker_id: a.broker_id,
          quantity: a.quantity,
        })),
      );
    }
  },
  async down(knex: Knex): Promise<void> {
    const hasPositions = await knex.schema.hasTable('positions');
    if (!hasPositions) {
      return;
    }

    const hasYearColumn = await knex.schema.hasColumn('positions', 'year');
    if (!hasYearColumn) {
      return;
    }

    const allocationsBackup = await knex('position_broker_allocations').select(
      'position_ticker',
      'position_year',
      'broker_id',
      'quantity',
    );
    await knex.schema.dropTableIfExists('position_broker_allocations');

    await knex.schema.renameTable('positions', 'positions_with_year');

    await knex.schema.createTable('positions', (table) => {
      table.text('ticker').primary();
      table
        .text('asset_type')
        .notNullable()
        .checkIn(['stock', 'fii', 'etf', 'bdr']);
      table.float('total_quantity').notNullable().defaultTo(0);
      table.float('average_price').notNullable().defaultTo(0);
      table.integer('average_price_cents').notNullable().defaultTo(0);
    });

    const yearGroups = new Map<string, { row: Record<string, unknown>; year: number }>();
    const oldRows = await knex('positions_with_year').select('*');
    for (const row of oldRows) {
      const key = row.ticker as string;
      const existing = yearGroups.get(key);
      if (!existing || (row.year as number) > existing.year) {
        yearGroups.set(key, {
          row: {
            ticker: row.ticker,
            asset_type: row.asset_type,
            total_quantity: row.total_quantity,
            average_price: row.average_price,
            average_price_cents: row.average_price_cents,
          },
          year: row.year as number,
        });
      }
    }
    const toInsert = Array.from(yearGroups.values()).map((v) => v.row);
    if (toInsert.length > 0) {
      await knex('positions').insert(toInsert);
    }
    await knex.schema.dropTableIfExists('positions_with_year');

    const maxYearByTicker = new Map<string, number>();
    for (const a of allocationsBackup) {
      const ticker = a.position_ticker as string;
      const year = a.position_year as number;
      const current = maxYearByTicker.get(ticker);
      if (current === undefined || year > current) {
        maxYearByTicker.set(ticker, year);
      }
    }

    await knex.schema.createTable('position_broker_allocations', (table) => {
      table.increments('id').primary();
      table.text('position_ticker').notNullable().references('ticker').inTable('positions');
      table.text('broker_id').notNullable().references('id').inTable('brokers');
      table.float('quantity').notNullable().defaultTo(0);
      table.unique(['position_ticker', 'broker_id']);
    });

    const toRestore = allocationsBackup.filter(
      (a) => (a.position_year as number) === maxYearByTicker.get(a.position_ticker as string),
    );
    if (toRestore.length > 0) {
      await knex('position_broker_allocations').insert(
        toRestore.map((a) => ({
          position_ticker: a.position_ticker,
          broker_id: a.broker_id,
          quantity: a.quantity,
        })),
      );
    }
  },
};
