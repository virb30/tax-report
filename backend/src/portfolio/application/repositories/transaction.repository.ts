import type { Transaction } from '../../domain/entities/transaction.entity';

export type InitialBalanceDocumentRecord = {
  ticker: string;
  year: number;
  averagePrice: string;
  totalQuantity: string;
  allocations: Array<{
    brokerId: string;
    quantity: string;
  }>;
};

export interface TransactionRepository {
  save(transaction: Transaction): Promise<void>;
  saveMany(transactions: Transaction[]): Promise<void>;
  findByTicker(ticker: string): Promise<Transaction[]>;
  findByDateAndBroker(input: { date: string; brokerId: string }): Promise<Transaction[]>;
  findByPeriod(input: { startDate: string; endDate: string }): Promise<Transaction[]>;
  findExistingExternalRefs(externalRefs: string[]): Promise<Set<string>>;
  deleteByTickerAndYear(ticker: string, year: number): Promise<void>;
  deleteInitialBalanceByTickerAndYear(ticker: string, year: number): Promise<void>;
  replaceInitialBalanceTransactionsForTickerAndYear(
    ticker: string,
    year: number,
    transactions: Transaction[],
  ): Promise<void>;
  findInitialBalanceDocumentsByYear(year: number): Promise<InitialBalanceDocumentRecord[]>;
  findInitialBalanceDocumentByTickerAndYear(
    ticker: string,
    year: number,
  ): Promise<InitialBalanceDocumentRecord | null>;
}
