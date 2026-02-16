import type { Transaction } from '../../domain/portfolio/transaction.entity';

export interface TransactionRepository {
  save(transaction: Transaction): Promise<void>;
  saveMany(transactions: Transaction[]): Promise<void>;
  findByTicker(ticker: string): Promise<Transaction[]>;
  findByPeriod(input: { startDate: string; endDate: string }): Promise<Transaction[]>;
  findExistingExternalRefs(externalRefs: string[]): Promise<Set<string>>;
  deleteByTickerAndYear(ticker: string, year: number): Promise<void>;
  deleteInitialBalanceByTickerAndYear(ticker: string, year: number): Promise<void>;
}
