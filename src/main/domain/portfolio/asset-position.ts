import type { AssetType } from '../../../shared/types/domain';
import { AveragePriceService } from './average-price-service';

export type AssetPositionSnapshot = {
  ticker: string;
  broker: string;
  assetType: AssetType;
  quantity: number;
  averagePrice: number;
  isManualBase: boolean;
};

export class AssetPosition {
  private readonly averagePriceService: AveragePriceService;
  private quantity: number;
  private averagePrice: number;

  private constructor(private readonly snapshot: AssetPositionSnapshot) {
    this.averagePriceService = new AveragePriceService();
    this.quantity = snapshot.quantity;
    this.averagePrice = snapshot.averagePrice;
    this.validate();
  }

  static create(snapshot: AssetPositionSnapshot): AssetPosition {
    return new AssetPosition(snapshot);
  }

  applyBuy(input: { quantity: number; unitPrice: number; operationalCosts: number }): void {
    const nextQuantity = this.quantity + input.quantity;
    const nextAveragePrice = this.averagePriceService.calculateAfterBuy({
      currentQuantity: this.quantity,
      currentAveragePrice: this.averagePrice,
      buyQuantity: input.quantity,
      buyUnitPrice: input.unitPrice,
      operationalCosts: input.operationalCosts,
    });

    this.quantity = nextQuantity;
    this.averagePrice = nextAveragePrice;
    this.validate();
  }

  applySell(input: { quantity: number }): void {
    if (input.quantity <= 0) {
      throw new Error('Sell quantity must be greater than zero.');
    }
    if (this.quantity === 0) {
      throw new Error('Cannot sell asset without an open position.');
    }

    const nextQuantity = this.quantity - input.quantity;
    if (nextQuantity < 0) {
      throw new Error('Cannot sell more than current quantity.');
    }

    this.quantity = nextQuantity;
    this.validate();
  }

  toSnapshot(): AssetPositionSnapshot {
    return {
      ticker: this.snapshot.ticker,
      broker: this.snapshot.broker,
      assetType: this.snapshot.assetType,
      quantity: this.quantity,
      averagePrice: this.averagePrice,
      isManualBase: this.snapshot.isManualBase,
    };
  }

  private validate(): void {
    if (this.quantity < 0) {
      throw new Error('Asset quantity cannot be negative.');
    }

    if (this.averagePrice < 0) {
      throw new Error('Average price cannot be negative.');
    }

    if (this.quantity > 0 && this.averagePrice === 0) {
      throw new Error('Average price must be greater than zero when quantity exists.');
    }
  }
}
