import type { TransactionRecord } from '../../domain/portfolio/transaction.entity';

export interface TransactionRepository {
  save(transaction: TransactionRecord): Promise<void>;
  saveMany(transactions: TransactionRecord[]): Promise<void>;
  findByTicker(ticker: string): Promise<TransactionRecord[]>;
  findByPeriod(input: { startDate: string; endDate: string }): Promise<TransactionRecord[]>;
  findExistingExternalRefs(externalRefs: string[]): Promise<Set<string>>;
  deleteInitialBalanceByTickerAndYear(ticker: string, year: number): Promise<void>;
}
