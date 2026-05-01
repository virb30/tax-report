import { SourceType, TransactionType } from "../../../../shared/types/domain";
import { Transaction } from "./transaction.entity";
import { Uuid } from "../../shared/uuid.vo";
import { Quantity } from "../value-objects/quantity.vo";
import { Money } from "../value-objects/money.vo";

describe('TransactionEntity', () => {

  const fakeBrokerId = Uuid.create();
  it('should create a transaction', () => {
    const transaction = Transaction.create({
      date: '2025-01-01',
      type: TransactionType.Buy,
      ticker: 'PETR4',
      quantity: Quantity.from(10),
      unitPrice: Money.from(100),
      fees: Money.from(10),
      brokerId: fakeBrokerId,
      sourceType: SourceType.Pdf,
    });

    expect(transaction.id.value).toBeDefined();
    expect(transaction.date).toBe('2025-01-01');
    expect(transaction.type).toBe(TransactionType.Buy);
    expect(transaction.ticker).toBe('PETR4');
    expect(transaction.quantity.getAmount()).toBe('10');
    expect(transaction.unitPrice.getAmount()).toBe('100');
    expect(transaction.fees.getAmount()).toBe('10');
    expect(transaction.quantityAmount).toBe('10');
    expect(transaction.unitPriceAmount).toBe('100');
    expect(transaction.feesAmount).toBe('10');
    expect(transaction.brokerId.value).toBe(fakeBrokerId.value);
    expect(transaction.sourceType).toBe(SourceType.Pdf);
  });

  it('should restore a transaction', () => {
    const transactionId = Uuid.create();
    const transaction = Transaction.restore({
      id: transactionId,
      date: '2025-01-01',
      type: TransactionType.Buy,
      ticker: 'PETR4',
      quantity: Quantity.from(10),
      unitPrice: Money.from(100),
      fees: Money.from(10),
      brokerId: fakeBrokerId,
      sourceType: SourceType.Pdf,
    });
    expect(transaction.id.value).toBe(transactionId.value);
    expect(transaction.date).toBe('2025-01-01');
    expect(transaction.type).toBe(TransactionType.Buy);
    expect(transaction.ticker).toBe('PETR4');
    expect(transaction.quantity.getAmount()).toBe('10');
    expect(transaction.unitPrice.getAmount()).toBe('100');
    expect(transaction.fees.getAmount()).toBe('10');
    expect(transaction.quantityAmount).toBe('10');
    expect(transaction.unitPriceAmount).toBe('100');
    expect(transaction.feesAmount).toBe('10');
    expect(transaction.brokerId.value).toBe(fakeBrokerId.value);
    expect(transaction.sourceType).toBe(SourceType.Pdf);
  });
});
