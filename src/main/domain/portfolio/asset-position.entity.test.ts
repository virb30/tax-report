import { describe, expect, it } from '@jest/globals';
import { AssetType } from '../../../shared/types/domain';
import { AssetPosition } from './asset-position.entity';

describe('AssetPosition (entity)', () => {
  it('applyBuy updates average price and quantity, increments broker allocation', () => {
    const position = AssetPosition.create({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      totalQuantity: 10,
      averagePrice: 30,
      brokerBreakdown: [{ brokerId: 'broker-xp', quantity: 10 }],
    });

    position.applyBuy({
      quantity: 10,
      unitPrice: 40,
      fees: 10,
      brokerId: 'broker-xp',
    });

    const snapshot = position.toSnapshot();
    expect(snapshot.totalQuantity).toBe(20);
    expect(snapshot.averagePrice).toBe(35.5);
    expect(snapshot.brokerBreakdown).toEqual([{ brokerId: 'broker-xp', quantity: 20 }]);
  });

  it('applySell reduces quantity without changing average price', () => {
    const position = AssetPosition.create({
      ticker: 'VALE3',
      assetType: AssetType.Stock,
      totalQuantity: 20,
      averagePrice: 50,
      brokerBreakdown: [{ brokerId: 'broker-xp', quantity: 20 }],
    });

    position.applySell({ quantity: 5, brokerId: 'broker-xp' });

    const snapshot = position.toSnapshot();
    expect(snapshot.totalQuantity).toBe(15);
    expect(snapshot.averagePrice).toBe(50);
    expect(snapshot.brokerBreakdown).toEqual([{ brokerId: 'broker-xp', quantity: 15 }]);
  });

  it('applyBonus dilutes average price', () => {
    const position = AssetPosition.create({
      ticker: 'ITSA4',
      assetType: AssetType.Stock,
      totalQuantity: 100,
      averagePrice: 10,
      brokerBreakdown: [{ brokerId: 'broker-xp', quantity: 100 }],
    });

    position.applyBonus({ quantity: 50, brokerId: 'broker-xp' });

    const snapshot = position.toSnapshot();
    expect(snapshot.totalQuantity).toBe(150);
    expect(snapshot.averagePrice).toBeCloseTo(1000 / 150, 10);
    expect(snapshot.brokerBreakdown).toEqual([{ brokerId: 'broker-xp', quantity: 150 }]);
  });

  it('applyInitialBalance defines base for new position', () => {
    const position = AssetPosition.create({
      ticker: 'IVVB11',
      assetType: AssetType.Etf,
      totalQuantity: 0,
      averagePrice: 0,
      brokerBreakdown: [],
    });

    position.applyInitialBalance({
      quantity: 2,
      averagePrice: 300,
      brokerId: 'broker-xp',
    });

    const snapshot = position.toSnapshot();
    expect(snapshot.totalQuantity).toBe(2);
    expect(snapshot.averagePrice).toBe(300);
    expect(snapshot.brokerBreakdown).toEqual([{ brokerId: 'broker-xp', quantity: 2 }]);
  });

  it('applyInitialBalance sums when broker already has allocation', () => {
    const position = AssetPosition.create({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      totalQuantity: 10,
      averagePrice: 20,
      brokerBreakdown: [{ brokerId: 'broker-xp', quantity: 10 }],
    });

    position.applyInitialBalance({
      quantity: 10,
      averagePrice: 30,
      brokerId: 'broker-xp',
    });

    const snapshot = position.toSnapshot();
    expect(snapshot.totalQuantity).toBe(20);
    expect(snapshot.averagePrice).toBe(25);
    expect(snapshot.brokerBreakdown).toEqual([{ brokerId: 'broker-xp', quantity: 20 }]);
  });

  it('throws when selling more than broker allocation', () => {
    const position = AssetPosition.create({
      ticker: 'ITSA4',
      assetType: AssetType.Stock,
      totalQuantity: 2,
      averagePrice: 10,
      brokerBreakdown: [{ brokerId: 'broker-xp', quantity: 2 }],
    });

    expect(() => position.applySell({ quantity: 3, brokerId: 'broker-xp' })).toThrow(
      'Cannot sell more than current quantity allocated to this broker.',
    );
  });

  it('throws on invalid invariants', () => {
    expect(() =>
      AssetPosition.create({
        ticker: 'ABEV3',
        assetType: AssetType.Stock,
        totalQuantity: -1,
        averagePrice: 1,
        brokerBreakdown: [],
      }),
    ).toThrow('Total quantity cannot be negative.');

    expect(() =>
      AssetPosition.create({
        ticker: 'ABEV3',
        assetType: AssetType.Stock,
        totalQuantity: 1,
        averagePrice: -1,
        brokerBreakdown: [{ brokerId: 'x', quantity: 1 }],
      }),
    ).toThrow('Average price cannot be negative.');
  });
});
