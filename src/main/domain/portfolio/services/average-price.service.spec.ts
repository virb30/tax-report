import { describe, expect, it } from '@jest/globals';
import { AveragePriceService } from './average-price.service';
import { AssetType } from '../../../../shared/types/domain';
import { AssetPosition } from '../entities/asset-position.entity';
import { Uuid } from '../../shared/uuid.vo';
import { Money } from '../value-objects/money.vo';

describe('AveragePriceService', () => {
  const brokerId = Uuid.create();
  it('calculates weighted average with operational costs', () => {
    const service = new AveragePriceService();
    const averagePrice = service.calculateAfterBuy(AssetPosition.create({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      totalQuantity: 10,
      averagePrice: 30,
      year: 2020,
      brokerBreakdown: [{ brokerId, quantity: 10 }],
    }), {
      buyQuantity: 10,
      buyUnitPrice: 40,
      operationalCosts: 10,
    });

    expect(averagePrice).toBe(35.5);
  });

  it('calculates first buy from empty position', () => {
    const service = new AveragePriceService();

    const averagePrice = service.calculateAfterBuy(AssetPosition.create({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      year: 2020,
    }), {
      buyQuantity: 10,
      buyUnitPrice: 25,
      operationalCosts: 5,
    });

    expect(averagePrice).toBe(25.5);
  });

  it('throws when buy quantity is zero', () => {
    const service = new AveragePriceService();

    expect(() =>
      service.calculateAfterBuy(AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2020,
        totalQuantity: 1,
        averagePrice: 10,
        brokerBreakdown: [{ brokerId: Uuid.create(), quantity: 1 }],
      }), {
        buyQuantity: 0,
        buyUnitPrice: 10,
        operationalCosts: 0,
      }),
    ).toThrow('Buy quantity must be greater than zero.');
  });

  describe('calculateAfterBonus', () => {
    it('dilutes average price when bonus has no cost (unitCost = 0)', () => {
      const service = new AveragePriceService();
      const bonusQuantity = 50;

      const averagePrice = service.calculateAfterBonus(AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2020,
        totalQuantity: 100,
        averagePrice: 10,
        brokerBreakdown: [{ brokerId, quantity: 100 }],
      }), bonusQuantity, 0);

      const expectedAveragePrice = Money.from(1000).divideBy(150).toNumber();
      expect(averagePrice).toBe(expectedAveragePrice);
    });

    it('increases average price when bonus carries a unit cost', () => {
      const service = new AveragePriceService();
      const averagePrice = service.calculateAfterBonus(AssetPosition.create({
        ticker: 'ITSA4',
        assetType: AssetType.Stock,
        year: 2020,
        totalQuantity: 100,
        averagePrice: 10,
        brokerBreakdown: [{ brokerId, quantity: 100 }],
      }), 50, 5);

      const expectedAveragePrice = Money.from(1250).divideBy(150).toNumber();
      expect(averagePrice).toBe(expectedAveragePrice);
    });

    it('throws when bonus quantity is zero', () => {
      const service = new AveragePriceService();
      const bonusQuantity = 0;

      expect(() =>
        service.calculateAfterBonus(AssetPosition.create({
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          year: 2020,
          totalQuantity: 10,
          averagePrice: 10,
          brokerBreakdown: [{ brokerId, quantity: 10 }],
        }), bonusQuantity, 0),
      ).toThrow('Bonus quantity must be greater than zero.');
    });
  });
});
