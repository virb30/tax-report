import { describe, expect, it } from '@jest/globals';
import { AveragePriceService } from './average-price-service';

describe('AveragePriceService', () => {
  it('calculates weighted average with operational costs', () => {
    const service = new AveragePriceService();

    const averagePrice = service.calculateAfterBuy({
      currentQuantity: 10,
      currentAveragePrice: 30,
      buyQuantity: 10,
      buyUnitPrice: 40,
      operationalCosts: 10,
    });

    expect(averagePrice).toBe(35.5);
  });

  it('calculates first buy from empty position', () => {
    const service = new AveragePriceService();

    const averagePrice = service.calculateAfterBuy({
      currentQuantity: 0,
      currentAveragePrice: 0,
      buyQuantity: 10,
      buyUnitPrice: 25,
      operationalCosts: 5,
    });

    expect(averagePrice).toBe(25.5);
  });

  it('throws when buy quantity is zero', () => {
    const service = new AveragePriceService();

    expect(() =>
      service.calculateAfterBuy({
        currentQuantity: 1,
        currentAveragePrice: 10,
        buyQuantity: 0,
        buyUnitPrice: 10,
        operationalCosts: 0,
      }),
    ).toThrow('Buy quantity must be greater than zero.');
  });

  it('throws when price or cost is negative', () => {
    const service = new AveragePriceService();

    expect(() =>
      service.calculateAfterBuy({
        currentQuantity: 1,
        currentAveragePrice: -1,
        buyQuantity: 1,
        buyUnitPrice: 10,
        operationalCosts: 0,
      }),
    ).toThrow('Money amount cannot be negative.');

    expect(() =>
      service.calculateAfterBuy({
        currentQuantity: 1,
        currentAveragePrice: 10,
        buyQuantity: 1,
        buyUnitPrice: -10,
        operationalCosts: 0,
      }),
    ).toThrow('Money amount cannot be negative.');
  });
});
