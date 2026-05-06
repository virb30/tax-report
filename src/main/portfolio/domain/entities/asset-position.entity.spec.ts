import { AssetType } from '../../../shared/types/domain';
import { AssetPosition, MIN_SUPPORTED_YEAR } from './asset-position.entity';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { Quantity } from '../value-objects/quantity.vo';
import { Money } from '../value-objects/money.vo';

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
    expect(position.totalQuantity.getAmount()).toEqual(Quantity.from(0).getAmount());
    expect(position.averagePrice.getAmount()).toEqual(Money.from(0).getAmount());
    expect(position.brokerBreakdown).toEqual([]);
  });

  it('should restore asset position with saved values', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      year: 2020,
      totalQuantity: Quantity.from(10),
      averagePrice: Money.from(30),
      brokerBreakdown: [{ brokerId, quantity: Quantity.from(10) }],
    });

    expect(position.ticker).toEqual('PETR4');
    expect(position.assetType).toEqual(AssetType.Stock);
    expect(position.year).toEqual(2020);
    expect(position.totalQuantity.getAmount()).toEqual(Quantity.from(10).getAmount());
    expect(position.averagePrice.getAmount()).toEqual(Money.from(30).getAmount());
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: Quantity.from(10) }]);
  });

  it('applyBuy updates average price and quantity, increments broker allocation', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      totalQuantity: Quantity.from(10),
      averagePrice: Money.from(30),
      year: 2025,
      brokerBreakdown: [{ brokerId, quantity: Quantity.from(10) }],
    });

    position.applyBuy({
      quantity: Quantity.from(10),
      unitPrice: Money.from(40),
      fees: Money.from(10),
      brokerId: brokerId,
    });

    expect(position.totalQuantity.getAmount()).toBe(Quantity.from(20).getAmount());
    expect(position.averagePrice.getAmount()).toBe(Money.from(35.5).getAmount());
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: Quantity.from(20) }]);
  });

  it('applySell reduces quantity without changing average price', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'VALE3',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: Quantity.from(20),
      averagePrice: Money.from(50),
      brokerBreakdown: [{ brokerId, quantity: Quantity.from(20) }],
    });

    position.applySell({ quantity: Quantity.from(5), brokerId });

    expect(position.totalQuantity.getAmount()).toBe(Quantity.from(15).getAmount());
    expect(position.averagePrice.getAmount()).toBe(Money.from(50).getAmount());
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: Quantity.from(15) }]);
  });

  it('applySell reduces broker quantity', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'VALE3',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: Quantity.from(20),
      averagePrice: Money.from(50),
      brokerBreakdown: [{ brokerId, quantity: Quantity.from(20) }],
    });

    position.applySell({ quantity: Quantity.from(5), brokerId });

    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: Quantity.from(15) }]);
  });

  it('applySell removes broker quantity when it reaches 0', () => {
    const brokerId = Uuid.create();
    const brokerId2 = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'VALE3',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: Quantity.from(30),
      averagePrice: Money.from(50),
      brokerBreakdown: [
        { brokerId, quantity: Quantity.from(20) },
        { brokerId: brokerId2, quantity: Quantity.from(10) },
      ],
    });

    position.applySell({ quantity: Quantity.from(20), brokerId });

    expect(position.brokerBreakdown).toEqual([
      { brokerId: brokerId2, quantity: Quantity.from(10) },
    ]);
  });

  it('applyBonus dilutes average price when unitCost is zero', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'ITSA4',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: Quantity.from(100),
      averagePrice: Money.from(10),
      brokerBreakdown: [{ brokerId, quantity: Quantity.from(100) }],
    });

    position.applyBonus({ quantity: Quantity.from(50), unitCost: Money.from(0), brokerId });

    expect(position.totalQuantity.getAmount()).toBe(Quantity.from(150).getAmount());
    expect(Number(position.averagePrice.getAmount())).toBeCloseTo(1000 / 150, 2);
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: Quantity.from(150) }]);
  });

  it('applyBonus adds cost to total when unitCost is greater than zero', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'ITSA4',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: Quantity.from(100),
      averagePrice: Money.from(10),
      brokerBreakdown: [{ brokerId, quantity: Quantity.from(100) }],
    });

    position.applyBonus({ quantity: Quantity.from(50), unitCost: Money.from(5), brokerId });

    const expectedAveragePrice = Number((1250 / 150).toFixed(2));
    expect(position.totalQuantity.getAmount()).toBe(Quantity.from(150).getAmount());
    expect(Number(position.averagePrice.getAmount())).toBeCloseTo(expectedAveragePrice, 2);
    expect(Number(position.totalCost.getAmount())).toBe(1250);
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: Quantity.from(150) }]);
  });

  it('applyBonus uses fractional quantity for average price but credits only whole shares', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.restore({
      ticker: 'ITSA4',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: Quantity.from(10),
      averagePrice: Money.from(10),
      brokerBreakdown: [{ brokerId, quantity: Quantity.from(10) }],
    });

    position.applyBonus({ quantity: Quantity.from(1.5), unitCost: Money.from(11), brokerId });

    expect(position.totalQuantity.getAmount()).toBe(Quantity.from(11).getAmount());
    expect(Number(position.averagePrice.getAmount())).toBeCloseTo(10.13, 2);
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: Quantity.from(11) }]);
  });

  it('applyInitialBalance defines base for new position', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.create({
      ticker: 'IVVB11',
      assetType: AssetType.Etf,
      year: 2025,
    });

    position.applyInitialBalance({
      quantity: Quantity.from(2),
      averagePrice: Money.from(300),
      brokerId,
    });

    expect(position.totalQuantity.getAmount()).toBe(Quantity.from(2).getAmount());
    expect(position.averagePrice.getAmount()).toBe(Money.from(300).getAmount());
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: Quantity.from(2) }]);
  });

  it('applyInitialBalance resets when broker already has allocation', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.create({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: Quantity.from(10),
      averagePrice: Money.from(20),
      brokerBreakdown: [{ brokerId, quantity: Quantity.from(10) }],
    });

    position.applyInitialBalance({
      quantity: Quantity.from(10),
      averagePrice: Money.from(30),
      brokerId,
    });

    expect(position.totalQuantity.getAmount()).toBe(Quantity.from(10).getAmount());
    expect(position.averagePrice.getAmount()).toBe(Money.from(30).getAmount());
    expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: Quantity.from(10) }]);
  });

  it('applyInitialBalance clears allocations from other brokers', () => {
    const oldBrokerId = Uuid.create();
    const initialBalanceBrokerId = Uuid.create();
    const position = AssetPosition.create({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: Quantity.from(1),
      averagePrice: Money.from(20),
      brokerBreakdown: [{ brokerId: oldBrokerId, quantity: Quantity.from(1) }],
    });

    position.applyInitialBalance({
      quantity: Quantity.from(6),
      averagePrice: Money.from(20),
      brokerId: initialBalanceBrokerId,
    });

    expect(position.totalQuantity.getAmount()).toBe(Quantity.from(6).getAmount());
    expect(position.averagePrice.getAmount()).toBe(Money.from(20).getAmount());
    expect(position.brokerBreakdown).toEqual([
      { brokerId: initialBalanceBrokerId, quantity: Quantity.from(6) },
    ]);
  });

  it('throws when selling more than broker allocation', () => {
    const brokerId = Uuid.create();
    const position = AssetPosition.create({
      ticker: 'ITSA4',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: Quantity.from(2),
      averagePrice: Money.from(10),
      brokerBreakdown: [{ brokerId, quantity: Quantity.from(2) }],
    });

    expect(() => position.applySell({ quantity: Quantity.from(3), brokerId })).toThrow(
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
        totalQuantity: Quantity.from(-1),
        averagePrice: Money.from(1),
        brokerBreakdown: [],
      }),
    ).toThrow('Quantity cannot be negative.');

    expect(() =>
      AssetPosition.create({
        ticker: 'ABEV3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(1),
        averagePrice: Money.from(-1),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(1) }],
      }),
    ).toThrow('Average price cannot be negative.');

    expect(() =>
      AssetPosition.create({
        ticker: 'ABEV3',
        assetType: AssetType.Stock,
        year: MIN_SUPPORTED_YEAR - 1,
        totalQuantity: Quantity.from(1),
        averagePrice: Money.from(1),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(1) }],
      }),
    ).toThrow(`Year must be greater than or equal to ${MIN_SUPPORTED_YEAR}.`);

    expect(() =>
      AssetPosition.create({
        ticker: 'ABEV3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(1),
        averagePrice: Money.from(1),
        brokerBreakdown: [
          { brokerId, quantity: Quantity.from(1) },
          { brokerId: Uuid.create(), quantity: Quantity.from(1) },
        ],
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
        totalQuantity: Quantity.from(100),
        averagePrice: Money.from(20),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(100) }],
      });

      position.applyTransferOut({ quantity: Quantity.from(100), brokerId });

      expect(position.totalQuantity.getAmount()).toBe(Quantity.from(0).getAmount());
      expect(position.averagePrice.getAmount()).toBe(Money.from(20).getAmount());
      expect(position.brokerBreakdown).toEqual([]);
    });

    it('removes partial quantity from source broker', () => {
      const brokerId = Uuid.create();
      const brokerId2 = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'VALE3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(100),
        averagePrice: Money.from(50),
        brokerBreakdown: [
          { brokerId, quantity: Quantity.from(60) },
          { brokerId: brokerId2, quantity: Quantity.from(40) },
        ],
      });

      position.applyTransferOut({ quantity: Quantity.from(40), brokerId });

      expect(position.totalQuantity.getAmount()).toBe(Quantity.from(60).getAmount());
      expect(position.averagePrice.getAmount()).toBe(Money.from(50).getAmount());
      const alloc = position.brokerBreakdown.find((b) => b.brokerId.value === brokerId.value);
      expect(alloc?.quantity.getAmount()).toBe(Quantity.from(20).getAmount());
    });

    it('throws when quantity is zero', () => {
      const brokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'MGLU3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(10),
        averagePrice: Money.from(5),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(10) }],
      });

      expect(() => position.applyTransferOut({ quantity: Quantity.from(0), brokerId })).toThrow(
        'Transfer quantity must be greater than zero.',
      );
    });

    it('throws when transferring more than broker holds', () => {
      const brokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'WEGE3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(10),
        averagePrice: Money.from(40),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(10) }],
      });

      expect(() => position.applyTransferOut({ quantity: Quantity.from(20), brokerId })).toThrow(
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
        totalQuantity: Quantity.from(0),
        averagePrice: Money.from(30),
        brokerBreakdown: [],
      });

      position.applyTransferIn({ quantity: Quantity.from(50), brokerId });

      expect(position.totalQuantity.getAmount()).toBe(Quantity.from(50).getAmount());
      expect(position.averagePrice.getAmount()).toBe(Money.from(30).getAmount());
      expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: Quantity.from(50) }]);
    });

    it('throws when quantity is zero', () => {
      const brokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'BBAS3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(0),
        averagePrice: Money.from(30),
        brokerBreakdown: [],
      });

      expect(() => position.applyTransferIn({ quantity: Quantity.from(0), brokerId })).toThrow(
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
        totalQuantity: Quantity.from(100),
        averagePrice: Money.from(20),
        brokerBreakdown: [{ brokerId: fromBrokerId, quantity: Quantity.from(100) }],
      });

      const initialTotalCost = position.totalCost;

      position.applyTransferOut({ quantity: Quantity.from(100), brokerId: fromBrokerId });
      position.applyTransferIn({ quantity: Quantity.from(100), brokerId: toBrokerId });

      expect(position.totalQuantity.getAmount()).toBe(Quantity.from(100).getAmount());
      expect(position.averagePrice.getAmount()).toBe(Money.from(20).getAmount());
      expect(Number(position.totalCost.getAmount())).toBeCloseTo(
        Number(initialTotalCost.getAmount()),
        5,
      );
      expect(position.brokerBreakdown).toEqual([
        { brokerId: toBrokerId, quantity: Quantity.from(100) },
      ]);
    });
  });

  describe('applySplit', () => {
    it('increases quantity and reduces average price while keeping total cost constant', () => {
      const brokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'AAPL34',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(10),
        averagePrice: Money.from(100),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(10) }],
      });

      position.applySplit({ ratio: 4 });

      expect(position.totalQuantity.getAmount()).toBe(Quantity.from(40).getAmount());
      expect(position.averagePrice.getAmount()).toBe(Money.from(25).getAmount());
      expect(position.totalCost.getAmount()).toBe(Money.from(1000).getAmount());
      expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: Quantity.from(40) }]);
    });

    it('applies split to multiple brokers and rounds down if necessary', () => {
      const brokerId1 = Uuid.create();
      const brokerId2 = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'MSFT34',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(15),
        averagePrice: Money.from(200),
        brokerBreakdown: [
          { brokerId: brokerId1, quantity: Quantity.from(10) },
          { brokerId: brokerId2, quantity: Quantity.from(5) },
        ],
      });

      position.applySplit({ ratio: 1.5 });

      expect(position.totalQuantity.getAmount()).toBe(Quantity.from(22).getAmount());
      expect(Number(position.averagePrice.getAmount())).toBeCloseTo(3000 / 22, 2);
    });
  });

  describe('applyReverseSplit', () => {
    it('decreases quantity and increases average price while keeping total cost constant', () => {
      const brokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'GOGL34',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(100),
        averagePrice: Money.from(10),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(100) }],
      });

      // Total Cost = 1000
      position.applyReverseSplit({ ratio: 10 }); // 10:1 reverse split

      expect(position.totalQuantity.getAmount()).toBe(Quantity.from(10).getAmount());
      expect(position.averagePrice.getAmount()).toBe(Money.from(100).getAmount());
      expect(position.totalCost.getAmount()).toBe(Money.from(1000).getAmount());
      expect(position.brokerBreakdown).toEqual([{ brokerId, quantity: Quantity.from(10) }]);
    });

    it('applies reverse split with rounding floor per broker (B3 rule)', () => {
      const brokerId1 = Uuid.create();
      const brokerId2 = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'MGLU3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(109),
        averagePrice: Money.from(10),
        brokerBreakdown: [
          { brokerId: brokerId1, quantity: Quantity.from(55) },
          { brokerId: brokerId2, quantity: Quantity.from(54) },
        ],
      });

      position.applyReverseSplit({ ratio: 10 });
      expect(position.totalQuantity.getAmount()).toBe(Quantity.from(10).getAmount());
      expect(position.averagePrice.getAmount()).toBe(Money.from(109).getAmount());
      expect(position.totalCost.getAmount()).toBe(Money.from(1090).getAmount());
    });

    it('sets average price to 0 if all shares are lost due to rounding', () => {
      const brokerId = Uuid.create();
      const position = AssetPosition.restore({
        ticker: 'OIBR3',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(5),
        averagePrice: Money.from(1),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(5) }],
      });

      position.applyReverseSplit({ ratio: 10 });

      expect(position.totalQuantity.getAmount()).toBe(Quantity.from(0).getAmount());
      expect(position.averagePrice.getAmount()).toBe(Money.from(0).getAmount());
      expect(position.brokerBreakdown).toEqual([]);
    });
  });
});
