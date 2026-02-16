import { describe, expect, it } from '@jest/globals';
import { AssetType } from '../../../shared/types/domain';
import { AssetPosition, MIN_SUPPORTED_YEAR } from './asset-position.entity';
import { Uuid } from '../shared/uuid.vo';

describe('AssetPosition', () => {

  it('should create a new asset position with empty values', () => {
    const position = AssetPosition.create({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      year: 2020,
    });

    expect(position.ticker).toEqual('PETR4');
    expect(position.assetType).toEqual(AssetType.Stock);
    expect(position.year).toEqual(2020);
    expect(position.totalQuantity).toEqual(0);
    expect(position.averagePrice).toEqual(0);
    expect(position.brokerBreakdown).toEqual([]);
  });

  it('should restore asset position with saved values', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      year: 2020,
      totalQuantity: 10,
      averagePrice: 30,
      brokerBreakdown: [{ brokerId , quantity: 10 }],
    });

    expect(position.ticker).toEqual('PETR4');
    expect(position.assetType).toEqual(AssetType.Stock);
    expect(position.year).toEqual(2020);
    expect(position.totalQuantity).toEqual(10);
    expect(position.averagePrice).toEqual(30);
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: 10 }]);
  });

  it('applyBuy updates average price and quantity, increments broker allocation', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      totalQuantity: 10,
      averagePrice: 30,
      year: 2025,
      brokerBreakdown: [{ brokerId, quantity: 10 }],
    });

    position.applyBuy({
      quantity: 10,
      unitPrice: 40,
      fees: 10,
      brokerId: brokerId,
    });

    expect(position.totalQuantity).toBe(20);
    expect(position.averagePrice).toBe(35.5);
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: 20 }]);
  });

  it('applySell reduces quantity without changing average price', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'VALE3',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: 20,
      averagePrice: 50,
      brokerBreakdown: [{ brokerId, quantity: 20 }],
    });

    position.applySell({ quantity: 5, brokerId });

    expect(position.totalQuantity).toBe(15);
    expect(position.averagePrice).toBe(50);
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: 15 }]);
  });

  it('applySell reduces broker quantity', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'VALE3',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: 20,
      averagePrice: 50,
      brokerBreakdown: [{ brokerId, quantity: 20 }],
    });

    position.applySell({ quantity: 5, brokerId });

    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: 15 }]);
  });

  it('applySell removes broker quantity when it reaches 0', () => {
    const brokerId = Uuid.create();
    const brokerId2 = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'VALE3',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: 30,
      averagePrice: 50,
      brokerBreakdown: [{ brokerId, quantity: 20 }, { brokerId: brokerId2, quantity: 10 }],
    });

    position.applySell({ quantity: 20, brokerId });

    expect(position.brokerBreakdown).toEqual([{ brokerId: brokerId2, quantity: 10 }]);
  });

  it('applyBonus dilutes average price', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'ITSA4',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: 100,
      averagePrice: 10,
      brokerBreakdown: [{ brokerId, quantity: 100 }],
    });

    position.applyBonus({ quantity: 50, brokerId });

    expect(position.totalQuantity).toBe(150);
    expect(position.averagePrice).toBeCloseTo(1000 / 150, 10);
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: 150 }]);
  });

  it('applyInitialBalance defines base for new position', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.create({
      ticker: 'IVVB11',
      assetType: AssetType.Etf,
      year: 2025,
    });

    position.applyInitialBalance({
      quantity: 2,
      averagePrice: 300,
      brokerId,
    });

    expect(position.totalQuantity).toBe(2);
    expect(position.averagePrice).toBe(300);
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: 2 }]);
  });

  it('applyInitialBalance sums when broker already has allocation', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.create({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: 10,
      averagePrice: 20,
      brokerBreakdown: [{ brokerId, quantity: 10 }],
    });

    position.applyInitialBalance({
      quantity: 10,
      averagePrice: 30,
      brokerId,
    });

    expect(position.totalQuantity).toBe(20);
    expect(position.averagePrice).toBe(25);
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: 20 }]);
  });

  it('throws when selling more than broker allocation', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.create({
      ticker: 'ITSA4',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: 2,
      averagePrice: 10,
      brokerBreakdown: [{ brokerId, quantity: 2 }],
    });

    expect(() => position.applySell({ quantity: 3, brokerId })).toThrow(
      'Cannot sell more than current quantity allocated to this broker.',
    );
  });

  it('throws on invalid invariants', () => {
    const brokerId = Uuid.create();
    expect(() =>
      AssetPosition.create({
        ticker: 'ABEV3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: -1,
        averagePrice: 1,
        brokerBreakdown: [],
      }),
    ).toThrow('Total quantity cannot be negative.');

    expect(() =>
      AssetPosition.create({
        ticker: 'ABEV3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 1,
        averagePrice: -1,
        brokerBreakdown: [{ brokerId, quantity: 1 }],
      }),
    ).toThrow('Average price cannot be negative.');

    expect(() =>
      AssetPosition.create({
        ticker: 'ABEV3',
        assetType: AssetType.Stock,
        year: MIN_SUPPORTED_YEAR - 1,
        totalQuantity: 1,
        averagePrice: 1,
        brokerBreakdown: [{ brokerId, quantity: 1 }],
      }),
    ).toThrow(`Year must be greater than or equal to ${MIN_SUPPORTED_YEAR}.`);

    expect(() =>
      AssetPosition.create({
        ticker: 'ABEV3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 1,
        averagePrice: 1,
        brokerBreakdown: [{ brokerId, quantity: 1 }, { brokerId: Uuid.create(), quantity: 1 }],
      }),
    ).toThrow(`Broker breakdown sum (2) must equal total quantity (1).`);
  });
});
