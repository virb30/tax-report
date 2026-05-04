import type { Knex } from 'knex';
import type {
  InitialBalanceDocumentRecord,
  TransactionRepository,
} from '../../application/repositories/transaction.repository';
import { Transaction } from '../../domain/entities/transaction.entity';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { TransactionType } from '../../../../shared/types/domain';
import type { SourceType } from '../../../../shared/types/domain';
import { Quantity } from '../../domain/value-objects/quantity.vo';
import { Money } from '../../domain/value-objects/money.vo';

type TransactionRow = {
  id: string;
  date: string;
  type: string;
  ticker: string;
  quantity: string;
  unit_price: string;
  total_fees: string | null;
  broker_id: string;
  source_type: string;
  external_ref: string | null;
  import_batch_id: string | null;
};

type InitialBalanceRow = Pick<
  TransactionRow,
  'ticker' | 'date' | 'broker_id' | 'quantity' | 'unit_price' | 'type'
>;

function toPersistence(transaction: Transaction): Record<string, unknown> {
  return {
    id: transaction.id.value,
    date: transaction.date,
    type: transaction.type,
    ticker: transaction.ticker,
    quantity: transaction.quantityAmount,
    unit_price: transaction.unitPriceAmount,
    broker_id: transaction.brokerId.value,
    source_type: transaction.sourceType,
    external_ref: transaction.externalRef ?? null,
    import_batch_id: transaction.importBatchId ?? null,
  };
}

function toDomain(row: TransactionRow): Transaction {
  return Transaction.restore({
    id: Uuid.from(row.id),
    date: row.date,
    type: row.type as TransactionType,
    ticker: row.ticker,
    quantity: Quantity.from(row.quantity),
    unitPrice: Money.from(row.unit_price),
    fees: Money.from(row.total_fees ?? 0),
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
    const rows = await this.transactionReadQuery()
      .where('transactions.ticker', ticker)
      .orderBy('transactions.date', 'asc');
    return rows.map(toDomain);
  }

  async findByDateAndBroker(input: { date: string; brokerId: string }): Promise<Transaction[]> {
    const rows = await this.transactionReadQuery()
      .where({ 'transactions.date': input.date, 'transactions.broker_id': input.brokerId })
      .orderBy('transactions.ticker', 'asc')
      .orderBy('transactions.id', 'asc');
    return rows.map(toDomain);
  }

  async findByPeriod(input: { startDate: string; endDate: string }): Promise<Transaction[]> {
    const rows = await this.transactionReadQuery()
      .whereBetween('transactions.date', [input.startDate, input.endDate])
      .orderBy('transactions.date', 'asc');
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

  private transactionReadQuery(): Knex.QueryBuilder<unknown, TransactionRow[]> {
    return this.database('transactions')
      .leftJoin('transaction_fees', 'transaction_fees.transaction_id', 'transactions.id')
      .select([
        'transactions.id',
        'transactions.date',
        'transactions.type',
        'transactions.ticker',
        'transactions.quantity',
        'transactions.unit_price',
        'transaction_fees.total_fees as total_fees',
        'transactions.broker_id',
        'transactions.source_type',
        'transactions.external_ref',
        'transactions.import_batch_id',
      ]);
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
          totalQuantity: '0',
          allocations: [],
        } satisfies InitialBalanceDocumentRecord);

      document.averagePrice = row.unit_price;
      document.totalQuantity = Quantity.from(document.totalQuantity)
        .add(Quantity.from(row.quantity))
        .getAmount();
      document.allocations.push({
        brokerId: row.broker_id,
        quantity: row.quantity,
      });

      documents.set(row.ticker, document);
    }

    return [...documents.values()];
  }
}
