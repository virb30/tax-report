import { AssetType } from '../../../../shared/types/domain';
import { SourceType, TransactionType } from '../../../../shared/types/domain';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { AssetPosition } from '../entities/asset-position.entity';
import { Transaction } from '../entities/transaction.entity';
import { Money } from '../value-objects/money.vo';
import { Quantity } from '../value-objects/quantity.vo';
import { PositionCalculatorService } from './position-calculator.service';

const brokerId = Uuid.create();

describe('PositionCalculator', () => {
  const calculator = new PositionCalculatorService();

  it('calculates positions from transactions', () => {
    const transactions = [
      Transaction.create({
        type: TransactionType.InitialBalance,
        date: '2024-01-01',
        ticker: 'PETR4',
        quantity: Quantity.from(100),
        unitPrice: Money.from(20),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        type: TransactionType.Buy,
        date: '2024-06-15',
        ticker: 'PETR4',
        quantity: Quantity.from(50),
        unitPrice: Money.from(25),
        fees: Money.from(5),
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        type: TransactionType.Sell,
        date: '2024-09-01',
        ticker: 'PETR4',
        quantity: Quantity.from(30),
        unitPrice: Money.from(30),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ];

    const positions = calculator.compute(transactions, [], 2024);

    expect(positions).toHaveLength(1);
    expect(positions[0].ticker).toBe('PETR4');
    expect(positions[0].totalQuantity.getAmount()).toBe('120');
    expect(positions[0].year).toBe(2024);
  });

  it('uses base positions to preserve assetType', () => {
    const basePosition = AssetPosition.create({
      ticker: 'HGLG11',
      assetType: AssetType.Fii,
      year: 2024,
    });

    const transactions = [
      Transaction.create({
        type: TransactionType.InitialBalance,
        date: '2024-01-01',
        ticker: 'HGLG11',
        quantity: Quantity.from(10),
        unitPrice: Money.from(150),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ];

    const positions = calculator.compute(transactions, [basePosition], 2024);

    expect(positions[0].assetType).toBe(AssetType.Fii);
    expect(positions[0].totalQuantity.getAmount()).toBe('10');
  });

  it('returns multiple positions for multiple tickers', () => {
    const transactions = [
      Transaction.create({
        type: TransactionType.InitialBalance,
        date: '2024-01-01',
        ticker: 'PETR4',
        quantity: Quantity.from(100),
        unitPrice: Money.from(20),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        type: TransactionType.InitialBalance,
        date: '2024-01-01',
        ticker: 'VALE3',
        quantity: Quantity.from(50),
        unitPrice: Money.from(60),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ];

    const positions = calculator.compute(transactions, [], 2024);

    expect(positions).toHaveLength(2);
    const petr = positions.find((p) => p.ticker === 'PETR4');
    const vale = positions.find((p) => p.ticker === 'VALE3');
    expect(petr?.totalQuantity.getAmount()).toBe('100');
    expect(vale?.totalQuantity.getAmount()).toBe('50');
  });

  it('processes Split and ReverseSplit', () => {
    const transactions = [
      Transaction.create({
        type: TransactionType.InitialBalance,
        date: '2024-01-01',
        ticker: 'PETR4',
        quantity: Quantity.from(10),
        unitPrice: Money.from(100),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        type: TransactionType.Split,
        date: '2024-02-01',
        ticker: 'PETR4',
        quantity: Quantity.from(4), // 1:4 split
        unitPrice: Money.from(0),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        type: TransactionType.ReverseSplit,
        date: '2024-03-01',
        ticker: 'PETR4',
        quantity: Quantity.from(10), // 10:1 reverse split
        unitPrice: Money.from(0),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ];

    const positions = calculator.compute(transactions, [], 2024);

    expect(positions[0].totalQuantity.getAmount()).toBe('4');
    expect(positions[0].averagePrice.getAmount()).toBe('250');
  });
});
