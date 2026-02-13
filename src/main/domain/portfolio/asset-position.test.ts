import { describe, expect, it } from '@jest/globals';
import { AssetType } from '../../../shared/types/domain';
import { AssetPosition } from './asset-position';

describe('AssetPosition', () => {
  it('updates average price and quantity on buy', () => {
    const position = AssetPosition.create({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 10,
      averagePrice: 30,
      isManualBase: false,
    });

    position.applyBuy({
      quantity: 10,
      unitPrice: 40,
      operationalCosts: 10,
    });

    const snapshot = position.toSnapshot();
    expect(snapshot.quantity).toBe(20);
    expect(snapshot.averagePrice).toBe(35.5);
  });

  it('reduces quantity on sell without changing average price', () => {
    const position = AssetPosition.create({
      ticker: 'VALE3',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 20,
      averagePrice: 50,
      isManualBase: false,
    });

    position.applySell({ quantity: 5 });

    const snapshot = position.toSnapshot();
    expect(snapshot.quantity).toBe(15);
    expect(snapshot.averagePrice).toBe(50);
  });

  it('throws when selling more than available quantity', () => {
    const position = AssetPosition.create({
      ticker: 'ITSA4',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 2,
      averagePrice: 10,
      isManualBase: false,
    });

    expect(() => position.applySell({ quantity: 3 })).toThrow(
      'Cannot sell more than current quantity.',
    );
  });

  it('throws on invalid buy or sell quantity', () => {
    const position = AssetPosition.create({
      ticker: 'B3SA3',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 1,
      averagePrice: 12,
      isManualBase: false,
    });

    expect(() => position.applyBuy({ quantity: 0, unitPrice: 10, operationalCosts: 0 })).toThrow(
      'Buy quantity must be greater than zero.',
    );
    expect(() => position.applySell({ quantity: 0 })).toThrow(
      'Sell quantity must be greater than zero.',
    );
  });

  it('throws when created with invalid invariant values', () => {
    expect(() =>
      AssetPosition.create({
        ticker: 'ABEV3',
        broker: 'XP',
        assetType: AssetType.Stock,
        quantity: -1,
        averagePrice: 1,
        isManualBase: false,
      }),
    ).toThrow('Asset quantity cannot be negative.');

    expect(() =>
      AssetPosition.create({
        ticker: 'ABEV3',
        broker: 'XP',
        assetType: AssetType.Stock,
        quantity: 1,
        averagePrice: -1,
        isManualBase: false,
      }),
    ).toThrow('Average price cannot be negative.');
  });
});
