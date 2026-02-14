import type { AssetType } from '../../../shared/types/domain';
import { AveragePriceService } from './average-price-service';

export type BrokerAllocation = {
  brokerId: string;
  quantity: number;
};

export type AssetPositionSnapshot = {
  ticker: string;
  assetType: AssetType;
  totalQuantity: number;
  averagePrice: number;
  brokerBreakdown: BrokerAllocation[];
};

export class AssetPosition {
  private readonly averagePriceService: AveragePriceService;
  private totalQuantity: number;
  private averagePrice: number;
  private brokerBreakdown: Map<string, number>;

  private constructor(private readonly snapshot: AssetPositionSnapshot) {
    this.averagePriceService = new AveragePriceService();
    this.totalQuantity = snapshot.totalQuantity;
    this.averagePrice = snapshot.averagePrice;
    this.brokerBreakdown = new Map(
      snapshot.brokerBreakdown.map((a) => [a.brokerId, a.quantity]),
    );
    this.validate();
  }

  static create(snapshot: AssetPositionSnapshot): AssetPosition {
    return new AssetPosition(snapshot);
  }

  applyBuy(input: {
    quantity: number;
    unitPrice: number;
    fees: number;
    brokerId: string;
  }): void {
    if (input.quantity <= 0) {
      throw new Error('Buy quantity must be greater than zero.');
    }

    const nextQuantity = this.totalQuantity + input.quantity;
    const nextAveragePrice = this.averagePriceService.calculateAfterBuy({
      currentQuantity: this.totalQuantity,
      currentAveragePrice: this.averagePrice,
      buyQuantity: input.quantity,
      buyUnitPrice: input.unitPrice,
      operationalCosts: input.fees,
    });

    const currentBrokerQty = this.brokerBreakdown.get(input.brokerId) ?? 0;
    this.brokerBreakdown.set(input.brokerId, currentBrokerQty + input.quantity);

    this.totalQuantity = nextQuantity;
    this.averagePrice = nextAveragePrice;
    this.validate();
  }

  applySell(input: { quantity: number; brokerId: string }): void {
    if (input.quantity <= 0) {
      throw new Error('Sell quantity must be greater than zero.');
    }
    if (this.totalQuantity === 0) {
      throw new Error('Cannot sell asset without an open position.');
    }

    const brokerQty = this.brokerBreakdown.get(input.brokerId) ?? 0;
    if (input.quantity > brokerQty) {
      throw new Error(
        'Cannot sell more than current quantity allocated to this broker.',
      );
    }

    const nextQuantity = this.totalQuantity - input.quantity;
    const newBrokerQty = brokerQty - input.quantity;
    if (newBrokerQty > 0) {
      this.brokerBreakdown.set(input.brokerId, newBrokerQty);
    } else {
      this.brokerBreakdown.delete(input.brokerId);
    }

    this.totalQuantity = nextQuantity;
    this.validate();
  }

  applyBonus(input: { quantity: number; brokerId: string }): void {
    if (input.quantity <= 0) {
      throw new Error('Bonus quantity must be greater than zero.');
    }

    const nextQuantity = this.totalQuantity + input.quantity;
    const nextAveragePrice = this.averagePriceService.calculateAfterBonus({
      currentQuantity: this.totalQuantity,
      currentAveragePrice: this.averagePrice,
      bonusQuantity: input.quantity,
    });

    const currentBrokerQty = this.brokerBreakdown.get(input.brokerId) ?? 0;
    this.brokerBreakdown.set(input.brokerId, currentBrokerQty + input.quantity);

    this.totalQuantity = nextQuantity;
    this.averagePrice = nextAveragePrice;
    this.validate();
  }

  applyInitialBalance(input: {
    quantity: number;
    averagePrice: number;
    brokerId: string;
  }): void {
    if (input.quantity <= 0) {
      throw new Error('Initial balance quantity must be greater than zero.');
    }
    if (input.averagePrice <= 0) {
      throw new Error('Initial balance average price must be greater than zero.');
    }

    const existingBrokerQty = this.brokerBreakdown.get(input.brokerId) ?? 0;
    const existingTotalCost = this.totalQuantity * this.averagePrice;
    const newBrokerCost = input.quantity * input.averagePrice;

    const nextQuantity = this.totalQuantity + input.quantity;
    const nextTotalCost = existingTotalCost + newBrokerCost;
    const nextAveragePrice = nextTotalCost / nextQuantity;

    this.brokerBreakdown.set(input.brokerId, existingBrokerQty + input.quantity);
    this.totalQuantity = nextQuantity;
    this.averagePrice = nextAveragePrice;
    this.validate();
  }

  toSnapshot(): AssetPositionSnapshot {
    return {
      ticker: this.snapshot.ticker,
      assetType: this.snapshot.assetType,
      totalQuantity: this.totalQuantity,
      averagePrice: this.averagePrice,
      brokerBreakdown: Array.from(this.brokerBreakdown.entries()).map(
        ([brokerId, quantity]) => ({ brokerId, quantity }),
      ),
    };
  }

  private validate(): void {
    if (this.totalQuantity < 0) {
      throw new Error('Total quantity cannot be negative.');
    }

    if (this.averagePrice < 0) {
      throw new Error('Average price cannot be negative.');
    }

    if (this.totalQuantity > 0 && this.averagePrice <= 0) {
      throw new Error('Average price must be greater than zero when quantity exists.');
    }

    const breakdownSum = Array.from(this.brokerBreakdown.values()).reduce(
      (acc, qty) => acc + qty,
      0,
    );
    if (Math.abs(breakdownSum - this.totalQuantity) > 1e-9) {
      throw new Error(
        `Broker breakdown sum (${breakdownSum}) must equal total quantity (${this.totalQuantity}).`,
      );
    }
  }
}
