
import { AssetType } from '../../../../shared/types/domain';
import { AssetPosition, MIN_SUPPORTED_YEAR } from './asset-position.entity';
import { Uuid } from '../../shared/uuid.vo';

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

  it('applyBonus dilutes average price when unitCost is zero', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'ITSA4',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: 100,
      averagePrice: 10,
      brokerBreakdown: [{ brokerId, quantity: 100 }],
    });

    position.applyBonus({ quantity: 50, unitCost: 0, brokerId });

    expect(position.totalQuantity).toBe(150);
    expect(position.averagePrice).toBeCloseTo(1000 / 150, 2);
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: 150 }]);
  });

  it('applyBonus adds cost to total when unitCost is greater than zero', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'ITSA4',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: 100,
      averagePrice: 10,
      brokerBreakdown: [{ brokerId, quantity: 100 }],
    });

    position.applyBonus({ quantity: 50, unitCost: 5, brokerId });

    const expectedAveragePrice = Number((1250 / 150).toFixed(2));
    expect(position.totalQuantity).toBe(150);
    expect(position.averagePrice).toBe(expectedAveragePrice);
    expect(position.totalCost).toBeCloseTo(expectedAveragePrice * 150, 2);
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: 150 }]);
  });

  it('applyBonus uses fractional quantity for average price but credits only whole shares', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'ITSA4',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: 10,
      averagePrice: 10,
      brokerBreakdown: [{ brokerId, quantity: 10 }],
    });

    position.applyBonus({ quantity: 1.5, unitCost: 11, brokerId });

    expect(position.totalQuantity).toBe(11);
    expect(position.averagePrice).toBe(10.13);
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: 11 }]);
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

  it('applyInitialBalance resets when broker already has allocation', () => {
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

    expect(position.totalQuantity).toBe(10);
    expect(position.averagePrice).toBe(30);
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: 10 }]);
  });

  it('applyInitialBalance clears allocations from other brokers', () => {
    const oldBrokerId = Uuid.create();
    const initialBalanceBrokerId = Uuid.create();
    const position = AssetPosition.create({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: 1,
      averagePrice: 20,
      brokerBreakdown: [{ brokerId: oldBrokerId, quantity: 1 }],
    });

    position.applyInitialBalance({
      quantity: 6,
      averagePrice: 20,
      brokerId: initialBalanceBrokerId,
    });

    expect(position.totalQuantity).toBe(6);
    expect(position.averagePrice).toBe(20);
    expect(position.brokerBreakdown).toEqual([
      { brokerId: initialBalanceBrokerId, quantity: 6 },
    ]);
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

  describe('applyTransferOut', () => {
    it('removes quantity from source broker without changing averagePrice', () => {
      const brokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 100,
        averagePrice: 20,
        brokerBreakdown: [{ brokerId, quantity: 100 }],
      });

      position.applyTransferOut({ quantity: 100, brokerId });

      expect(position.totalQuantity).toBe(0);
      expect(position.averagePrice).toBe(20);
      expect(position.brokerBreakdown).toEqual([]);
    });

    it('removes partial quantity from source broker', () => {
      const brokerId = Uuid.create();
      const brokerId2 = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'VALE3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 100,
        averagePrice: 50,
        brokerBreakdown: [{ brokerId, quantity: 60 }, { brokerId: brokerId2, quantity: 40 }],
      });

      position.applyTransferOut({ quantity: 40, brokerId });

      expect(position.totalQuantity).toBe(60);
      expect(position.averagePrice).toBe(50);
      const alloc = position.brokerBreakdown.find((b) => b.brokerId.value === brokerId.value);
      expect(alloc?.quantity).toBe(20);
    });

    it('throws when quantity is zero', () => {
      const brokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'MGLU3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 10,
        averagePrice: 5,
        brokerBreakdown: [{ brokerId, quantity: 10 }],
      });

      expect(() => position.applyTransferOut({ quantity: 0, brokerId })).toThrow(
        'Transfer quantity must be greater than zero.',
      );
    });

    it('throws when transferring more than broker holds', () => {
      const brokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'WEGE3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 10,
        averagePrice: 40,
        brokerBreakdown: [{ brokerId, quantity: 10 }],
      });

      expect(() => position.applyTransferOut({ quantity: 20, brokerId })).toThrow(
        'Cannot sell more than current quantity allocated to this broker.',
      );
    });
  });

  describe('applyTransferIn', () => {
    it('adds quantity to destination broker without changing averagePrice', () => {
      const brokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'BBAS3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 0,
        averagePrice: 30,
        brokerBreakdown: [],
      });

      position.applyTransferIn({ quantity: 50, brokerId });

      expect(position.totalQuantity).toBe(50);
      expect(position.averagePrice).toBe(30);
      expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: 50 }]);
    });

    it('throws when quantity is zero', () => {
      const brokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'BBAS3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 0,
        averagePrice: 30,
        brokerBreakdown: [],
      });

      expect(() => position.applyTransferIn({ quantity: 0, brokerId })).toThrow(
        'Transfer quantity must be greater than zero.',
      );
    });
  });

  describe('full transfer round-trip (TransferOut + TransferIn)', () => {
    it('preserves totalQuantity, averagePrice and totalCost after complete transfer', () => {
      const fromBrokerId = Uuid.create();
      const toBrokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'ITSA4',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 100,
        averagePrice: 20,
        brokerBreakdown: [{ brokerId: fromBrokerId, quantity: 100 }],
      });

      const initialTotalCost = position.totalCost;

      position.applyTransferOut({ quantity: 100, brokerId: fromBrokerId });
      position.applyTransferIn({ quantity: 100, brokerId: toBrokerId });

      expect(position.totalQuantity).toBe(100);
      expect(position.averagePrice).toBe(20);
      expect(position.totalCost).toBeCloseTo(initialTotalCost, 5);
      expect(position.brokerBreakdown).toEqual([{ brokerId: toBrokerId, quantity: 100 }]);
    });
  });

  describe('applySplit', () => {
    it('increases quantity and reduces average price while keeping total cost constant', () => {
      const brokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'AAPL34',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 10,
        averagePrice: 100,
        brokerBreakdown: [{ brokerId, quantity: 10 }],
      });

      position.applySplit({ ratio: 4 });

      expect(position.totalQuantity).toBe(40);
      expect(position.averagePrice).toBe(25);
      expect(position.totalCost).toBe(1000);
      expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: 40 }]);
    });

    it('applies split to multiple brokers and rounds down if necessary', () => {
      const brokerId1 = Uuid.create();
      const brokerId2 = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'MSFT34',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 15,
        averagePrice: 200,
        brokerBreakdown: [
          { brokerId: brokerId1, quantity: 10 },
          { brokerId: brokerId2, quantity: 5 },
        ],
      });

      position.applySplit({ ratio: 1.5 });

      expect(position.totalQuantity).toBe(22);
      expect(position.averagePrice).toBeCloseTo(3000 / 22, 2);
    });
  });

  describe('applyReverseSplit', () => {
    it('decreases quantity and increases average price while keeping total cost constant', () => {
      const brokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'GOGL34',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 100,
        averagePrice: 10,
        brokerBreakdown: [{ brokerId, quantity: 100 }],
      });

      // Total Cost = 1000
      position.applyReverseSplit({ ratio: 10 }); // 10:1 reverse split

      expect(position.totalQuantity).toBe(10);
      expect(position.averagePrice).toBe(100);
      expect(position.totalCost).toBe(1000);
      expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: 10 }]);
    });

    it('applies reverse split with rounding floor per broker (B3 rule)', () => {
      const brokerId1 = Uuid.create();
      const brokerId2 = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'MGLU3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 109,
        averagePrice: 10,
        brokerBreakdown: [
          { brokerId: brokerId1, quantity: 55 },
          { brokerId: brokerId2, quantity: 54 },
        ],
      });

      position.applyReverseSplit({ ratio: 10 });
      expect(position.totalQuantity).toBe(10);
      expect(position.averagePrice).toBe(109);
      expect(position.totalCost).toBe(1090);
    });

    it('sets average price to 0 if all shares are lost due to rounding', () => {
      const brokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'OIBR3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 5,
        averagePrice: 1,
        brokerBreakdown: [{ brokerId, quantity: 5 }],
      });

      position.applyReverseSplit({ ratio: 10 });

      expect(position.totalQuantity).toBe(0);
      expect(position.averagePrice).toBe(0);
      expect(position.brokerBreakdown).toEqual([]);
    });
  });
});
