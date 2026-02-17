import { Money } from '../value-objects/money.vo';
import { Quantity } from '../value-objects/quantity.vo';

export type CalculateAveragePriceInput = {
  currentQuantity: number;
  currentAveragePrice: number;
  buyQuantity: number;
  buyUnitPrice: number;
  operationalCosts: number;
};

export type CalculateAfterBonusInput = {
  currentQuantity: number;
  currentAveragePrice: number;
  bonusQuantity: number;
};

export class AveragePriceService {
  calculateAfterBuy(input: CalculateAveragePriceInput): number {
    const currentQuantity = Quantity.from(input.currentQuantity);
    const buyQuantity = Quantity.from(input.buyQuantity);
    if (buyQuantity.isZero()) {
      throw new Error('Buy quantity must be greater than zero.');
    }

    const currentAveragePrice = Money.from(input.currentAveragePrice);
    const buyUnitPrice = Money.from(input.buyUnitPrice);
    const operationalCosts = Money.from(input.operationalCosts);

    const currentTotalCost = currentAveragePrice.multiplyBy(currentQuantity.toNumber());
    const buyTotalCost = buyUnitPrice.multiplyBy(buyQuantity.toNumber());
    const nextTotalCost = currentTotalCost.add(buyTotalCost).add(operationalCosts);
    const nextQuantity = currentQuantity.add(buyQuantity);

    return nextTotalCost.divideBy(nextQuantity.toNumber()).toNumber();
  }

  /** Bonificação: aumenta quantidade mantendo custo total → PM dilui */
  calculateAfterBonus(input: CalculateAfterBonusInput): number {
    if (input.bonusQuantity <= 0) {
      throw new Error('Bonus quantity must be greater than zero.');
    }

    const currentTotalCost = input.currentQuantity * input.currentAveragePrice;
    const nextQuantity = input.currentQuantity + input.bonusQuantity;

    if (nextQuantity <= 0) {
      throw new Error('Total quantity after bonus must be greater than zero.');
    }

    return currentTotalCost / nextQuantity;
  }
}
