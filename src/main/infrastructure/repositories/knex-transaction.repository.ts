import type { Knex } from 'knex';
import type {
  InitialBalanceDocumentRecord,
  TransactionRepository,
} from '../../application/repositories/transaction.repository';
import { Transaction } from '../../domain/portfolio/entities/transaction.entity';
import { Uuid } from '../../domain/shared/uuid.vo';
import { TransactionType } from '../../../shared/types/domain';
import type { SourceType } from '../../../shared/types/domain';

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

type InitialBalanceRow = Pick<
  TransactionRow,
  'ticker' | 'date' | 'broker_id' | 'quantity' | 'unit_price' | 'type'
>;

function toPersistence(record: Transaction): Record<string, unknown> {
  const unitPriceCents = Math.round(record.unitPrice * 100);
  const feesCents = Math.round(record.fees * 100);

  return {
    id: record.id.value,
    date: record.date,
    type: record.type,
    ticker: record.ticker,
    quantity: record.quantity,
    unit_price: record.unitPrice,
    unit_price_cents: unitPriceCents,
    fees: record.fees,
    fees_cents: feesCents,
    broker_id: record.brokerId.value,
    source_type: record.sourceType,
    external_ref: record.externalRef ?? null,
    import_batch_id: record.importBatchId ?? null,
  };
}

function toDomain(row: TransactionRow): Transaction {
  return Transaction.restore({
    id: Uuid.from(row.id),
    date: row.date,
    type: row.type as TransactionType,
    ticker: row.ticker,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    fees: row.fees,
    brokerId: Uuid.from(row.broker_id),
    sourceType: row.source_type as SourceType,
    externalRef: row.external_ref ?? undefined,
    importBatchId: row.import_batch_id ?? undefined,
  });
}

export class KnexTransactionRepository implements TransactionRepository {
  constructor(private readonly database: Knex) {}

  async save(transaction: Transaction): Promise<void> {
    await this.database('transactions').insert(toPersistence(transaction));
  }

  async saveMany(transactions: Transaction[]): Promise<void> {
    if (transactions.length === 0) {
      return;
    }

    const rows = transactions.map((transaction) => toPersistence(transaction));
    await this.database('transactions').insert(rows);
  }

  async findByTicker(ticker: string): Promise<Transaction[]> {
    const rows = await this.database<TransactionRow>('transactions')
      .where({ ticker })
      .orderBy('date', 'asc')
      .select('*');
    return rows.map(toDomain);
  }

  async findByPeriod(input: { startDate: string; endDate: string }): Promise<Transaction[]> {
    const rows = await this.database<TransactionRow>('transactions')
      .whereBetween('date', [input.startDate, input.endDate])
      .orderBy('date', 'asc')
      .select('*');
    return rows.map(toDomain);
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

  async deleteInitialBalanceByTickerAndYear(ticker: string, year: number): Promise<void> {
    await this.database('transactions')
      .where({ ticker, type: TransactionType.InitialBalance })
      .whereBetween('date', this.yearBounds(year))
      .delete();
  }

  async deleteByTickerAndYear(ticker: string, year: number): Promise<void> {
    await this.database('transactions')
      .where({ ticker })
      .whereBetween('date', this.yearBounds(year))
      .delete();
  }

  async replaceInitialBalanceTransactionsForTickerAndYear(
    ticker: string,
    year: number,
    transactions: Transaction[],
  ): Promise<void> {
    await this.database.transaction(async (trx) => {
      await trx('transactions')
        .where({ ticker, type: TransactionType.InitialBalance })
        .whereBetween('date', this.yearBounds(year))
        .delete();

      if (transactions.length === 0) {
        return;
      }

      await trx('transactions').insert(
        transactions.map((transaction) => toPersistence(transaction)),
      );
    });
  }

  async findInitialBalanceDocumentsByYear(year: number): Promise<InitialBalanceDocumentRecord[]> {
    const rows = await this.database<InitialBalanceRow>('transactions')
      .where({ type: TransactionType.InitialBalance })
      .whereBetween('date', this.yearBounds(year))
      .orderBy('ticker', 'asc')
      .orderBy('broker_id', 'asc')
      .select('ticker', 'date', 'broker_id', 'quantity', 'unit_price', 'type');

    return this.groupInitialBalanceRows(rows, year);
  }

  async findInitialBalanceDocumentByTickerAndYear(
    ticker: string,
    year: number,
  ): Promise<InitialBalanceDocumentRecord | null> {
    const rows = await this.database<InitialBalanceRow>('transactions')
      .where({ ticker, type: TransactionType.InitialBalance })
      .whereBetween('date', this.yearBounds(year))
      .orderBy('broker_id', 'asc')
      .select('ticker', 'date', 'broker_id', 'quantity', 'unit_price', 'type');

    const [document] = this.groupInitialBalanceRows(rows, year);
    return document ?? null;
  }

  private yearBounds(year: number): [string, string] {
    return [`${year}-01-01`, `${year}-12-31`];
  }

  private groupInitialBalanceRows(
    rows: InitialBalanceRow[],
    fallbackYear: number,
  ): InitialBalanceDocumentRecord[] {
    const documents = new Map<string, InitialBalanceDocumentRecord>();

    for (const row of rows) {
      const year = Number.parseInt(row.date.slice(0, 4), 10) || fallbackYear;
      const document =
        documents.get(row.ticker) ??
        ({
          ticker: row.ticker,
          year,
          averagePrice: row.unit_price,
          totalQuantity: 0,
          allocations: [],
        } satisfies InitialBalanceDocumentRecord);

      document.averagePrice = row.unit_price;
      document.totalQuantity += row.quantity;
      document.allocations.push({
        brokerId: row.broker_id,
        quantity: row.quantity,
      });

      documents.set(row.ticker, document);
    }

    return [...documents.values()];
  }
}
