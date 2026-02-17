import { describe, expect, it } from '@jest/globals';
import { AssetType } from '../../../../shared/types/domain';
import { SourceType, TransactionType } from '../../../../shared/types/domain';
import { Uuid } from '../../shared/uuid.vo';
import { AssetPosition } from '../entities/asset-position.entity';
import { Transaction } from '../entities/transaction.entity';
import { PositionCalculatorService } from './position-calculator.service';

const brokerId = Uuid.create();

describe('PositionCalculator', () => {
  const calculator = new PositionCalculatorService();

  it('calcula posições a partir de transações', () => {
    const transactions = [
      Transaction.create({
        type: TransactionType.InitialBalance,
        date: '2024-01-01',
        ticker: 'PETR4',
        quantity: 100,
        unitPrice: 20,
        fees: 0,
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        type: TransactionType.Buy,
        date: '2024-06-15',
        ticker: 'PETR4',
        quantity: 50,
        unitPrice: 25,
        fees: 5,
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        type: TransactionType.Sell,
        date: '2024-09-01',
        ticker: 'PETR4',
        quantity: 30,
        unitPrice: 30,
        fees: 0,
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ];

    const positions = calculator.compute(transactions, [], 2024);

    expect(positions).toHaveLength(1);
    expect(positions[0].ticker).toBe('PETR4');
    expect(positions[0].totalQuantity).toBe(120);
    expect(positions[0].year).toBe(2024);
  });

  it('usa posições base para preservar assetType', () => {
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
        quantity: 10,
        unitPrice: 150,
        fees: 0,
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ];

    const positions = calculator.compute(transactions, [basePosition], 2024);

    expect(positions[0].assetType).toBe(AssetType.Fii);
    expect(positions[0].totalQuantity).toBe(10);
  });

  it('retorna múltiplas posições para múltiplos tickers', () => {
    const transactions = [
      Transaction.create({
        type: TransactionType.InitialBalance,
        date: '2024-01-01',
        ticker: 'PETR4',
        quantity: 100,
        unitPrice: 20,
        fees: 0,
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        type: TransactionType.InitialBalance,
        date: '2024-01-01',
        ticker: 'VALE3',
        quantity: 50,
        unitPrice: 60,
        fees: 0,
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ];

    const positions = calculator.compute(transactions, [], 2024);

    expect(positions).toHaveLength(2);
    const petr = positions.find((p) => p.ticker === 'PETR4');
    const vale = positions.find((p) => p.ticker === 'VALE3');
    expect(petr?.totalQuantity).toBe(100);
    expect(vale?.totalQuantity).toBe(50);
  });
});
