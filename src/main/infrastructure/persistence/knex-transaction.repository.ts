import type { Knex } from 'knex';
import type { TransactionRepository } from '../../application/repositories/transaction.repository';
import type { TransactionRecord } from '../../domain/portfolio/transaction.entity';
import { randomUUID } from 'node:crypto';

type TransactionRow = {
  id: string;
  date: string;
  type: string;
  ticker: string;
  quantity: number;
  unit_price: number;
  unit_price_cents: number;
  fees: number;
  fees_cents: number;
  broker_id: string;
  source_type: string;
  external_ref: string | null;
  import_batch_id: string | null;
};

function mapRecordToRow(record: TransactionRecord): Record<string, unknown> {
  const unitPriceCents = Math.round(record.unitPrice * 100);
  const feesCents = Math.round(record.fees * 100);

  return {
    id: record.id,
    date: record.date,
    type: record.type,
    ticker: record.ticker,
    quantity: record.quantity,
    unit_price: record.unitPrice,
    unit_price_cents: unitPriceCents,
    fees: record.fees,
    fees_cents: feesCents,
    broker_id: record.brokerId,
    source_type: record.sourceType,
    external_ref: record.externalRef ?? null,
    import_batch_id: record.importBatchId ?? null,
  };
}

function mapRowToRecord(row: TransactionRow): TransactionRecord {
  return {
    id: row.id,
    date: row.date,
    type: row.type as TransactionRecord['type'],
    ticker: row.ticker,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    fees: row.fees,
    brokerId: row.broker_id,
    sourceType: row.source_type as TransactionRecord['sourceType'],
    externalRef: row.external_ref ?? undefined,
    importBatchId: row.import_batch_id ?? undefined,
  };
}

export class KnexTransactionRepository implements TransactionRepository {
  constructor(private readonly database: Knex) {}

  async save(transaction: TransactionRecord): Promise<void> {
    const record = {
      ...transaction,
      id: transaction.id || randomUUID(),
    };
    await this.database('transactions').insert(mapRecordToRow(record));
  }

  async saveMany(transactions: TransactionRecord[]): Promise<void> {
    if (transactions.length === 0) {
      return;
    }

    const rows = transactions.map((t) =>
      mapRecordToRow({
        ...t,
        id: t.id || randomUUID(),
      }),
    );
    await this.database('transactions').insert(rows);
  }

  async findByTicker(ticker: string): Promise<TransactionRecord[]> {
    const rows = await this.database<TransactionRow>('transactions')
      .where({ ticker })
      .orderBy('date', 'asc')
      .select('*');
    return rows.map(mapRowToRecord);
  }

  async findByPeriod(input: {
    startDate: string;
    endDate: string;
  }): Promise<TransactionRecord[]> {
    const rows = await this.database<TransactionRow>('transactions')
      .whereBetween('date', [input.startDate, input.endDate])
      .orderBy('date', 'asc')
      .select('*');
    return rows.map(mapRowToRecord);
  }

  async findExistingExternalRefs(externalRefs: string[]): Promise<Set<string>> {
    if (externalRefs.length === 0) {
      return new Set();
    }
    const validRefs = externalRefs.filter((ref): ref is string => ref != null && ref !== '');
    if (validRefs.length === 0) {
      return new Set();
    }
    const rows = await this.database<{ external_ref: string | null }>('transactions')
      .whereIn('external_ref', validRefs)
      .select('external_ref');
    return new Set(rows.map((r) => r.external_ref).filter((r): r is string => r != null));
  }
}
