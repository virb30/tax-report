import { SourceType, TransactionType } from '../../../shared/types/domain';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { Transaction } from '../entities/transaction.entity';
import { Money } from '../value-objects/money.vo';
import { Quantity } from '../value-objects/quantity.vo';
import { TransactionFeeAllocator } from './transaction-fee-allocator.service';

describe('TransactionFeeAllocator', () => {
  const service = new TransactionFeeAllocator();

  it('returns zero allocations when total fees are zero', () => {
    const allocations = service.allocate({
      totalOperationalCosts: Money.from(0),
      operations: [
        { quantity: 10, unitPrice: Money.from(20) },
        { quantity: 5, unitPrice: Money.from(40) },
      ],
    });

    expect(allocations.map((allocation) => allocation.toNumber())).toEqual([0, 0]);
  });

  it('allocates fees proportionally and preserves the total', () => {
    const allocations = service.allocate({
      totalOperationalCosts: Money.from(1),
      operations: [
        { quantity: 1, unitPrice: Money.from(10) },
        { quantity: 2, unitPrice: Money.from(10) },
      ],
    });

    expect(allocations.map((allocation) => allocation.toNumber())).toEqual([0.333333, 0.666667]);
    expect(allocations.reduce((sum, current) => sum.add(current), Money.from(0)).toNumber()).toBe(
      1,
    );
  });

  it('uses largest remainder with deterministic tie-breaker', () => {
    const allocations = service.allocate({
      totalOperationalCosts: Money.from(0.000001),
      operations: [
        { quantity: 1, unitPrice: Money.from(10) },
        { quantity: 1, unitPrice: Money.from(10) },
        { quantity: 1, unitPrice: Money.from(10) },
      ],
    });

    expect(allocations.map((allocation) => allocation.toNumber())).toEqual([0.000001, 0, 0]);
  });

  it('falls back to deterministic even split when operation weights are zero', () => {
    const allocations = service.allocate({
      totalOperationalCosts: Money.from(0.000005),
      operations: [
        { quantity: 1, unitPrice: Money.from(0) },
        { quantity: 1, unitPrice: Money.from(0) },
      ],
    });

    expect(allocations.map((allocation) => allocation.toNumber())).toEqual([0.000003, 0.000002]);
  });

  it('keeps ineligible transactions out of the allocation', () => {
    const allocations = service.allocate({
      totalOperationalCosts: Money.from(3),
      operations: [
        { quantity: 1, unitPrice: Money.from(10), type: TransactionType.InitialBalance },
        { quantity: 1, unitPrice: Money.from(10), type: TransactionType.Bonus },
        { quantity: 1, unitPrice: Money.from(10), type: TransactionType.Split },
        { quantity: 1, unitPrice: Money.from(10), type: TransactionType.ReverseSplit },
        { quantity: 1, unitPrice: Money.from(10), type: TransactionType.TransferIn },
        { quantity: 1, unitPrice: Money.from(10), type: TransactionType.TransferOut },
        { quantity: 1, unitPrice: Money.from(10), type: TransactionType.FractionAuction },
        { quantity: 1, unitPrice: Money.from(10), type: TransactionType.Buy },
        { quantity: 1, unitPrice: Money.from(20), type: TransactionType.Sell },
      ],
    });

    expect(allocations.map((allocation) => allocation.toNumber())).toEqual([
      0, 0, 0, 0, 0, 0, 0, 1, 2,
    ]);
  });

  it('creates transaction fee projections only for eligible transactions', () => {
    const initialBalance = createTransaction(TransactionType.InitialBalance);
    const bonus = createTransaction(TransactionType.Bonus);
    const buy = createTransaction(TransactionType.Buy);
    const sell = createTransaction(TransactionType.Sell);

    const fees = service.allocateForTransactions({
      totalOperationalCosts: Money.from(3),
      transactions: [initialBalance, bonus, buy, sell],
    });

    expect(fees).toHaveLength(2);
    expect(fees.map((fee) => fee.transactionId.value)).toEqual([buy.id.value, sell.id.value]);
    expect(fees.map((fee) => fee.totalFees.toNumber())).toEqual([1.5, 1.5]);
  });

  it('returns zero allocations when every transaction is ineligible', () => {
    const allocations = service.allocate({
      totalOperationalCosts: Money.from(1),
      operations: [
        { quantity: 1, unitPrice: Money.from(10), type: TransactionType.InitialBalance },
        { quantity: 1, unitPrice: Money.from(10), type: TransactionType.Bonus },
      ],
    });

    expect(allocations.map((allocation) => allocation.toNumber())).toEqual([0, 0]);
  });

  it('throws for negative total operational costs', () => {
    expect(() =>
      service.allocate({
        totalOperationalCosts: Money.from(-1),
        operations: [{ quantity: 1, unitPrice: Money.from(10) }],
      }),
    ).toThrow('Total operational costs cannot be negative.');
  });

  it('throws when there are no operations', () => {
    expect(() =>
      service.allocate({
        totalOperationalCosts: Money.from(1),
        operations: [],
      }),
    ).toThrow('At least one operation is required for allocation.');
  });

  it('throws for invalid operation quantity', () => {
    expect(() =>
      service.allocate({
        totalOperationalCosts: Money.from(1),
        operations: [{ quantity: 0, unitPrice: Money.from(10) }],
      }),
    ).toThrow('Operation quantity must be greater than zero.');
  });

  it('throws for negative operation unit price', () => {
    expect(() =>
      service.allocate({
        totalOperationalCosts: Money.from(1),
        operations: [{ quantity: 1, unitPrice: Money.from(-10) }],
      }),
    ).toThrow('Operation unit price cannot be negative.');
  });

  function createTransaction(type: TransactionType): Transaction {
    return Transaction.create({
      date: '2025-04-01',
      type,
      ticker: 'PETR4',
      quantity: Quantity.from(1),
      unitPrice: Money.from(10),
      fees: Money.from(0),
      brokerId: Uuid.create(),
      sourceType: SourceType.Csv,
    });
  }
});
