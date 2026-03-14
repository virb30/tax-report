import { Money } from '../value-objects/money.vo';
import { Quantity } from '../value-objects/quantity.vo';
import type { AssetPosition } from '../entities/asset-position.entity';

type CalculateAveragePriceInput = {
  buyQuantity: number;
  buyUnitPrice: number;
  operationalCosts: number;
};


export class AveragePriceService {
  calculateAfterBuy(position: AssetPosition, input: CalculateAveragePriceInput): number {
    const currentQuantity = Quantity.from(position.totalQuantity);
    const buyQuantity = Quantity.from(input.buyQuantity);
    if (buyQuantity.isZero()) {
      throw new Error('Buy quantity must be greater than zero.');
    }

    const buyUnitPrice = Money.from(input.buyUnitPrice);
    const operationalCosts = Money.from(input.operationalCosts);

    const currentTotalCost = Money.from(position.totalCost);
    const buyTotalCost = buyUnitPrice.multiplyBy(buyQuantity.toNumber());
    const nextTotalCost = currentTotalCost.add(buyTotalCost).add(operationalCosts);
    const nextQuantity = currentQuantity.add(buyQuantity);

    return nextTotalCost.divideBy(nextQuantity.toNumber()).toNumber();
  }

  calculateAfterBonus(position: AssetPosition, bonusQty: number): number {
    const bonusQuantity = Quantity.from(bonusQty);
    if (bonusQuantity.isZero()) {
      throw new Error('Bonus quantity must be greater than zero.');
    }

    const currentTotalCost = Money.from(position.totalCost);
    const nextQuantity = Quantity.from(position.totalQuantity).add(bonusQuantity);

    if (nextQuantity.isZero()) {
      throw new Error('Total quantity after bonus must be greater than zero.');
    }

    return currentTotalCost.divideBy(nextQuantity.toNumber()).toNumber();
  }
}
