import { Money } from '../value-objects/money.vo';
import type { Quantity } from '../value-objects/quantity.vo';
import type { AssetPosition } from '../entities/asset-position.entity';

type CalculateAveragePriceInput = {
  buyQuantity: Quantity;
  buyUnitPrice: Money;
  operationalCosts: Money;
};

export class AveragePriceService {
  calculateAfterBuy(position: AssetPosition, input: CalculateAveragePriceInput): Money {
    const currentQuantity = position.totalQuantity;
    const buyQuantity = input.buyQuantity;
    if (buyQuantity.isZero()) {
      throw new Error('Buy quantity must be greater than zero.');
    }

    const buyUnitPrice = input.buyUnitPrice;
    const operationalCosts = input.operationalCosts;

    const currentTotalCost = position.totalCost;
    const buyTotalCost = buyUnitPrice.multiplyBy(buyQuantity.getAmount());
    const nextTotalCost = currentTotalCost.add(buyTotalCost).add(operationalCosts);
    const nextQuantity = currentQuantity.add(buyQuantity);
    
    console.log('buyUnitPrice', buyUnitPrice.getAmount());
    console.log('buyQuantity', buyQuantity.getAmount())
    console.log('operationalCosts', operationalCosts.getAmount());
    console.log('currentAveragePrice', position.averagePrice.getAmount());
    console.log('currentQuantity', currentQuantity.getAmount());
    console.log('nextQuantity', nextQuantity.getAmount());
    console.log('nextTotalCost', nextTotalCost.getAmount())


    return nextTotalCost.divideBy(nextQuantity.getAmount());
  }

  calculateAfterBonus(position: AssetPosition, bonusQty: Quantity, unitCost: Money): Money {
    if (bonusQty.isZero()) {
      throw new Error('Bonus quantity must be greater than zero.');
    }

    const currentTotalCost = position.totalCost;
    const bonusCost = unitCost.multiplyBy(bonusQty.getAmount());
    const nextTotalCost = currentTotalCost.add(bonusCost);
    const nextQuantity = position.totalQuantity.add(bonusQty);

    if (nextQuantity.isZero()) {
      throw new Error('Total quantity after bonus must be greater than zero.');
    }

    return nextTotalCost.divideBy(nextQuantity.getAmount());
  }

  calculateAfterQuantityChange(position: AssetPosition, nextFreq: Quantity): Money {
    if (nextFreq.isZero()) {
      return Money.from(0);
    }

    const currentTotalCost = position.totalCost;
    return currentTotalCost.divideBy(nextFreq.getAmount());
  }
}
