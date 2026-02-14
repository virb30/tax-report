import type { Knex } from 'knex';
import type { TickerDataRepository } from '../../application/repositories/ticker-data.repository';
import type { TickerDataRecord } from '../../application/repositories/ticker-data.repository';

type TickerDataRow = {
  ticker: string;
  cnpj: string;
  name: string | null;
};

function mapRowToRecord(row: TickerDataRow): TickerDataRecord {
  return {
    ticker: row.ticker,
    cnpj: row.cnpj,
    name: row.name ?? undefined,
  };
}

export class KnexTickerDataRepository implements TickerDataRepository {
  constructor(private readonly database: Knex) {}

  async findByTicker(ticker: string): Promise<TickerDataRecord | null> {
    const row = await this.database<TickerDataRow>('ticker_data')
      .where({ ticker })
      .first();
    return row ? mapRowToRecord(row) : null;
  }

  async findAll(): Promise<TickerDataRecord[]> {
    const rows = await this.database<TickerDataRow>('ticker_data')
      .select('*')
      .orderBy('ticker', 'asc');
    return rows.map(mapRowToRecord);
  }

  async save(record: TickerDataRecord): Promise<void> {
    await this.database('ticker_data')
      .insert({
        ticker: record.ticker,
        cnpj: record.cnpj,
        name: record.name ?? null,
      })
      .onConflict('ticker')
      .merge({
        cnpj: record.cnpj,
        name: record.name ?? null,
      });
  }
}
