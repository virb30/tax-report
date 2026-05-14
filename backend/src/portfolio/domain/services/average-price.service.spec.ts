import { AveragePriceService } from './average-price.service';
import { AssetType } from '../../../shared/types/domain';
import { AssetPosition } from '../entities/asset-position.entity';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { Money } from '../value-objects/money.vo';
import { Quantity } from '../value-objects/quantity.vo';

describe('AveragePriceService', () => {
  const brokerId = Uuid.create();
  it('calculates weighted average with operational costs', () => {
    const service = new AveragePriceService();
    const averagePrice = service.calculateAfterBuy(
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        totalQuantity: Quantity.from(10),
        averagePrice: Money.from(30),
        year: 2020,
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(10) }],
      }),
      {
        buyQuantity: Quantity.from(10),
        buyUnitPrice: Money.from(40),
        operationalCosts: Money.from(10),
      },
    );

    expect(averagePrice.getAmount()).toBe(Money.from(35.5).getAmount());
  });

  it('calculates first buy from empty position', () => {
    const service = new AveragePriceService();

    const averagePrice = service.calculateAfterBuy(
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2020,
      }),
      {
        buyQuantity: Quantity.from(10),
        buyUnitPrice: Money.from(25),
        operationalCosts: Money.from(5),
      },
    );

    expect(averagePrice.getAmount()).toBe(Money.from(25.5).getAmount());
  });

  it('throws when buy quantity is zero', () => {
    const service = new AveragePriceService();

    expect(() =>
      service.calculateAfterBuy(
        AssetPosition.create({
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          year: 2020,
          totalQuantity: Quantity.from(1),
          averagePrice: Money.from(10),
          brokerBreakdown: [{ brokerId: Uuid.create(), quantity: Quantity.from(1) }],
        }),
        {
          buyQuantity: Quantity.from(0),
          buyUnitPrice: Money.from(10),
          operationalCosts: Money.from(0),
        },
      ),
    ).toThrow('Buy quantity must be greater than zero.');
  });

  describe('calculateAfterBonus', () => {
    it('dilutes average price when bonus has no cost (unitCost = 0)', () => {
      const service = new AveragePriceService();
      const bonusQuantity = Quantity.from(50);

      const averagePrice = service.calculateAfterBonus(
        AssetPosition.create({
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          year: 2020,
          totalQuantity: Quantity.from(100),
          averagePrice: Money.from(10),
          brokerBreakdown: [{ brokerId, quantity: Quantity.from(100) }],
        }),
        bonusQuantity,
        Money.from(0),
      );

      const expectedAveragePrice = Money.from(1000).divideBy(150).getAmount();
      expect(averagePrice.getAmount()).toBe(expectedAveragePrice);
    });

    it('increases average price when bonus carries a unit cost', () => {
      const service = new AveragePriceService();
      const averagePrice = service.calculateAfterBonus(
        AssetPosition.create({
          ticker: 'ITSA4',
          assetType: AssetType.Stock,
          year: 2020,
          totalQuantity: Quantity.from(100),
          averagePrice: Money.from(10),
          brokerBreakdown: [{ brokerId, quantity: Quantity.from(100) }],
        }),
        Quantity.from(50),
        Money.from(5),
      );

      const expectedAveragePrice = Money.from(1250).divideBy(150).getAmount();
      expect(averagePrice.getAmount()).toBe(expectedAveragePrice);
    });

    it('uses fractional bonus quantity when calculating average price', () => {
      const service = new AveragePriceService();
      const averagePrice = service.calculateAfterBonus(
        AssetPosition.create({
          ticker: 'ITSA4',
          assetType: AssetType.Stock,
          year: 2020,
          totalQuantity: Quantity.from(10),
          averagePrice: Money.from(10),
          brokerBreakdown: [{ brokerId, quantity: Quantity.from(10) }],
        }),
        Quantity.from(1.5),
        Money.from(11),
      );

      const expectedAveragePrice = Money.from(116.5).divideBy(11.5).getAmount();
      expect(averagePrice.getAmount()).toBe(expectedAveragePrice);
    });

    it('throws when bonus quantity is zero', () => {
      const service = new AveragePriceService();
      const bonusQuantity = Quantity.from(0);

      expect(() =>
        service.calculateAfterBonus(
          AssetPosition.create({
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            year: 2020,
            totalQuantity: Quantity.from(10),
            averagePrice: Money.from(10),
            brokerBreakdown: [{ brokerId, quantity: Quantity.from(10) }],
          }),
          bonusQuantity,
          Money.from(0),
        ),
      ).toThrow('Bonus quantity must be greater than zero.');
    });
  });
});
