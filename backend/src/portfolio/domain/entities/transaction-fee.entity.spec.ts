import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { Money } from '../value-objects/money.vo';
import { TransactionFee } from './transaction-fee.entity';

describe('TransactionFee', () => {
  it('creates a transaction fee projection', () => {
    const transactionId = Uuid.create();

    const transactionFee = TransactionFee.create({
      transactionId,
      totalFees: Money.from(1.23),
    });

    expect(transactionFee.transactionId.value).toBe(transactionId.value);
    expect(transactionFee.totalFees.getAmount()).toBe('1.23');
    expect(transactionFee.totalFeesAmount).toBe('1.23');
  });

  it('restores a transaction fee projection', () => {
    const transactionId = Uuid.create();

    const transactionFee = TransactionFee.restore({
      transactionId,
      totalFees: Money.from(0.5),
    });

    expect(transactionFee.transactionId.value).toBe(transactionId.value);
    expect(transactionFee.totalFeesAmount).toBe('0.5');
  });

  it('rejects negative total fees', () => {
    expect(() =>
      TransactionFee.create({
        transactionId: Uuid.create(),
        totalFees: Money.from(-0.01),
      }),
    ).toThrow('Transaction fee total cannot be negative.');
  });
});
