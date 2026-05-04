import type { TransactionRepository } from '../../../portfolio/application/repositories/transaction.repository';
import type { TransactionFeeRepository } from '../../../portfolio/application/repositories/transaction-fee.repository';
import type { TransactionFeeAllocator } from '../../../portfolio/domain/services/transaction-fee-allocator.service';
import type { DailyBrokerTaxRepository } from '../repositories/daily-broker-tax.repository';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';

export type ReallocatedTransactionFeePosition = {
  ticker: string;
  year: number;
};

type ReallocateTransactionFeesResult = {
  recalculatedTickers: string[];
  affectedPositions: ReallocatedTransactionFeePosition[];
};

export class ReallocateTransactionFeesService {
  constructor(
    private readonly dailyBrokerTaxRepository: DailyBrokerTaxRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly transactionFeeRepository: TransactionFeeRepository,
    private readonly transactionFeeAllocator: TransactionFeeAllocator,
  ) {}

  async execute(input: {
    date: string;
    brokerId: string;
  }): Promise<ReallocateTransactionFeesResult> {
    const brokerId = Uuid.from(input.brokerId);
    const [dailyBrokerTax, transactions] = await Promise.all([
      this.dailyBrokerTaxRepository.findByDateAndBroker({
        date: input.date,
        brokerId,
      }),
      this.transactionRepository.findByDateAndBroker({
        date: input.date,
        brokerId: brokerId.value,
      }),
    ]);
    const apportionableTransactions = transactions.filter(
      (transaction) => !transaction.isInitialBalance(),
    );

    if (apportionableTransactions.length === 0) {
      return { recalculatedTickers: [], affectedPositions: [] };
    }

    const transactionFees = this.transactionFeeAllocator.allocateForTransactions({
      totalOperationalCosts: dailyBrokerTax?.fees ?? Money.from(0),
      transactions: apportionableTransactions,
    });

    await this.transactionFeeRepository.replaceForTransactions({
      transactionIds: apportionableTransactions.map((transaction) => transaction.id),
      fees: transactionFees,
    });

    const recalculatedTickers = [
      ...new Set(apportionableTransactions.map((transaction) => transaction.ticker)),
    ];
    const year = Number.parseInt(input.date.slice(0, 4), 10);

    return {
      recalculatedTickers,
      affectedPositions: recalculatedTickers.map((ticker) => ({ ticker, year })),
    };
  }
}
