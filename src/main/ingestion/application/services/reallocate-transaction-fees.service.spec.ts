import { mock, mockReset } from 'jest-mock-extended';
import { ReallocateTransactionFeesService } from './reallocate-transaction-fees.service';
import type { DailyBrokerTaxRepository } from '../repositories/daily-broker-tax.repository';
import type { TransactionRepository } from '../../../portfolio/application/repositories/transaction.repository';
import type { TransactionFeeRepository } from '../../../portfolio/application/repositories/transaction-fee.repository';
import { TransactionFeeAllocator } from '../../../portfolio/domain/services/transaction-fee-allocator.service';
import { Transaction } from '../../../portfolio/domain/entities/transaction.entity';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';
import { Quantity } from '../../../portfolio/domain/value-objects/quantity.vo';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { SourceType, TransactionType } from '../../../../shared/types/domain';
import { DailyBrokerTax } from '../../domain/entities/daily-broker-tax.entity';

describe('ReallocateTransactionFeesService', () => {
  const dailyBrokerTaxRepository = mock<DailyBrokerTaxRepository>();
  const transactionRepository = mock<TransactionRepository>();
  const transactionFeeRepository = mock<TransactionFeeRepository>();
  const brokerId = '019cece0-4a22-75b8-95c4-45eb6f4cb2f4';

  beforeEach(() => {
    mockReset(dailyBrokerTaxRepository);
    mockReset(transactionRepository);
    mockReset(transactionFeeRepository);
    dailyBrokerTaxRepository.findByDateAndBroker.mockResolvedValue(
      DailyBrokerTax.create({
        date: '2025-04-01',
        brokerId: Uuid.from(brokerId),
        fees: Money.from(1),
        irrf: Money.from(0),
      }),
    );
    transactionFeeRepository.replaceForTransactions.mockResolvedValue(undefined);
  });

  it('replaces transaction fee projections and returns affected positions', async () => {
    const transactions = [
      createTransaction({ ticker: 'PETR4', quantity: 1, unitPrice: 10 }),
      createTransaction({ ticker: 'VALE3', quantity: 2, unitPrice: 10 }),
    ];
    transactionRepository.findByDateAndBroker.mockResolvedValue(transactions);
    const service = createService();

    const result = await service.execute({
      date: '2025-04-01',
      brokerId,
    });

    const replacement = transactionFeeRepository.replaceForTransactions.mock.calls[0]?.[0];
    expect(replacement?.transactionIds.map((transactionId) => transactionId.value)).toEqual(
      transactions.map((transaction) => transaction.id.value),
    );
    expect(replacement?.fees.map((fee) => fee.totalFees.toNumber())).toEqual([0.33, 0.67]);
    expect(result).toEqual({
      recalculatedTickers: ['PETR4', 'VALE3'],
      affectedPositions: [
        { ticker: 'PETR4', year: 2025 },
        { ticker: 'VALE3', year: 2025 },
      ],
    });
  });

  it('uses zero fees when no daily broker tax exists', async () => {
    const transaction = createTransaction({ ticker: 'PETR4', quantity: 1, unitPrice: 10 });
    dailyBrokerTaxRepository.findByDateAndBroker.mockResolvedValue(null);
    transactionRepository.findByDateAndBroker.mockResolvedValue([transaction]);
    const service = createService();

    await service.execute({
      date: '2025-04-01',
      brokerId,
    });

    const replacement = transactionFeeRepository.replaceForTransactions.mock.calls[0]?.[0];
    expect(replacement?.fees.map((fee) => fee.totalFees.toNumber())).toEqual([0]);
  });

  it('does not project initial balance transactions for the same date and broker', async () => {
    transactionRepository.findByDateAndBroker.mockResolvedValue([
      Transaction.create({
        date: '2025-04-01',
        type: TransactionType.InitialBalance,
        ticker: 'PETR4',
        quantity: Quantity.from(1),
        unitPrice: Money.from(10),
        fees: Money.from(0),
        brokerId: Uuid.from(brokerId),
        sourceType: SourceType.Manual,
      }),
    ]);
    const service = createService();

    const result = await service.execute({
      date: '2025-04-01',
      brokerId,
    });

    expect(transactionFeeRepository.replaceForTransactions).not.toHaveBeenCalled();
    expect(result).toEqual({ recalculatedTickers: [], affectedPositions: [] });
  });

  function createService(): ReallocateTransactionFeesService {
    return new ReallocateTransactionFeesService(
      dailyBrokerTaxRepository,
      transactionRepository,
      transactionFeeRepository,
      new TransactionFeeAllocator(),
    );
  }

  function createTransaction(input: {
    ticker: string;
    quantity: number;
    unitPrice: number;
  }): Transaction {
    return Transaction.create({
      date: '2025-04-01',
      type: TransactionType.Buy,
      ticker: input.ticker,
      quantity: Quantity.from(input.quantity),
      unitPrice: Money.from(input.unitPrice),
      fees: Money.from(0),
      brokerId: Uuid.from(brokerId),
      sourceType: SourceType.Csv,
    });
  }
});
