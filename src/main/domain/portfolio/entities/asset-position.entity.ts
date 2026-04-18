import type { AssetType } from '../../../../shared/types/domain';
import { Uuid } from '../../shared/uuid.vo';
import { AveragePriceService } from '../services/average-price.service';

export type BrokerAllocation = {
  brokerId: Uuid;
  quantity: number;
};

export interface AssetPositionProps {
  ticker: string;
  assetType: AssetType;
  totalQuantity: number;
  averagePrice: number;
  brokerBreakdown: BrokerAllocation[];
  year: number;
};

interface RestoreAssetPositionProps {
  ticker: string;
  assetType: AssetType;
  year: number;
  totalQuantity: number;
  averagePrice: number;
  brokerBreakdown: BrokerAllocation[];
}

interface CreateAssetPositionProps {
  ticker: string;
  assetType: AssetType;
  year: number;
  totalQuantity?: number;
  averagePrice?: number;
  brokerBreakdown?: BrokerAllocation[];
}

interface ApplyOperationInput {
  quantity: number;
  brokerId: Uuid;
}

interface ApplyBuyInput extends ApplyOperationInput {
  unitPrice: number;
  fees?: number;
}

interface ApplySellInput extends ApplyOperationInput {}

interface ApplyBonusInput extends ApplyOperationInput {
  unitCost: number;
}

interface ApplyTransferOutInput extends ApplyOperationInput {}

interface ApplyTransferInInput extends ApplyOperationInput {}

interface ApplyInitialBalanceInput extends ApplyOperationInput {
  averagePrice: number;
}

export const MIN_SUPPORTED_YEAR = 2000;

export class AssetPosition {
  private readonly averagePriceService: AveragePriceService;
  private _totalQuantity: number;
  private _averagePrice: number;
  private _brokerBreakdown: Map<string, number>;
  private _year: number;

  private constructor(private readonly props: AssetPositionProps) {
    this.averagePriceService = new AveragePriceService();
    this._totalQuantity = props.totalQuantity;
    this._averagePrice = props.averagePrice;
    this._brokerBreakdown = new Map(
      props.brokerBreakdown.map((a) => [a.brokerId.value, a.quantity]),
    );
    this._year = props.year;
    this.validate();
  }

  static create(props: CreateAssetPositionProps): AssetPosition {
    return new AssetPosition({
      ticker: props.ticker,
      assetType: props.assetType,
      totalQuantity: props.totalQuantity ?? 0,
      averagePrice: props.averagePrice ?? 0,
      brokerBreakdown: props.brokerBreakdown ?? [],
      year: props.year,
    });
  }

  static restore(props: RestoreAssetPositionProps): AssetPosition {
    return new AssetPosition(props);
  }

  applyBuy(input: ApplyBuyInput): void {
    if (input.quantity <= 0) {
      throw new Error('Buy quantity must be greater than zero.');
    }

    const nextQuantity = this._totalQuantity + input.quantity;
    const nextAveragePrice = this.averagePriceService.calculateAfterBuy(this, {
      buyQuantity: input.quantity,
      buyUnitPrice: input.unitPrice,
      operationalCosts: input.fees ?? 0,
    });

    this.incrementBrokerQuantity(input.brokerId, input.quantity);

    this._totalQuantity = nextQuantity;
    this._averagePrice = nextAveragePrice;
    this.validate();
  }

  applySell(input: ApplySellInput): void {
    if (input.quantity <= 0) {
      throw new Error('Sell quantity must be greater than zero.');
    }
    if (this._totalQuantity === 0) {
      throw new Error('Cannot sell asset without an open position.');
    }

    this.decrementBrokerQuantity(input.brokerId, input.quantity);
    const nextQuantity = this.totalQuantity - input.quantity;

    this._totalQuantity = nextQuantity;
    this.validate();
  }

  applyBonus(input: ApplyBonusInput): void {
    if (input.quantity <= 0) {
      throw new Error('Bonus quantity must be greater than zero.');
    }

    const nextQuantity = this._totalQuantity + input.quantity;
    const nextAveragePrice = this.averagePriceService.calculateAfterBonus(
      this,
      input.quantity,
      input.unitCost,
    );

    this.incrementBrokerQuantity(input.brokerId, input.quantity);

    this._totalQuantity = nextQuantity;
    this._averagePrice = nextAveragePrice;
    this.validate();
  }

  applyTransferOut(input: ApplyTransferOutInput): void {
    if (input.quantity <= 0) {
      throw new Error('Transfer quantity must be greater than zero.');
    }

    this.decrementBrokerQuantity(input.brokerId, input.quantity);
    this._totalQuantity = this._totalQuantity - input.quantity;
    this.validate();
  }

  applyTransferIn(input: ApplyTransferInInput): void {
    if (input.quantity <= 0) {
      throw new Error('Transfer quantity must be greater than zero.');
    }

    this.incrementBrokerQuantity(input.brokerId, input.quantity);
    this._totalQuantity = this._totalQuantity + input.quantity;
    this.validate();
  }

  applyInitialBalance(input: ApplyInitialBalanceInput): void {
    if (input.quantity <= 0) {
      throw new Error('Initial balance quantity must be greater than zero.');
    }
    if (input.averagePrice <= 0) {
      throw new Error('Initial balance average price must be greater than zero.');
    }

    this.setBrokerQuantity(input.brokerId, input.quantity);
    this._averagePrice = input.averagePrice;
    this._totalQuantity = this.calculateTotalQuantity();

    this.validate();
  }

  get totalQuantity(): number {
    return this._totalQuantity;
  }

  get averagePrice(): number {
    return this._averagePrice;
  }

  get brokerBreakdown(): BrokerAllocation[] {
    return Array.from(this._brokerBreakdown.entries()).map(([brokerId, quantity]) => ({ brokerId: Uuid.from(brokerId), quantity }));
  }

  get year(): number {
    return this._year;
  }

  get assetType(): AssetType {
    return this.props.assetType;
  }

  get ticker(): string {
    return this.props.ticker;
  }

  get totalCost(): number {
    return this._totalQuantity * this._averagePrice;
  }

  private validate(): void {
    if (this._totalQuantity < 0) {
      throw new Error('Total quantity cannot be negative.');
    }

    if (this._averagePrice < 0) {
      throw new Error('Average price cannot be negative.');
    }

    if (this._year < MIN_SUPPORTED_YEAR) {
      throw new Error(`Year must be greater than or equal to ${MIN_SUPPORTED_YEAR}.`);
    }

    const breakdownSum = Array.from(this._brokerBreakdown.values()).reduce(
      (acc, qty) => acc + qty,
      0,
    );
    if (Math.abs(breakdownSum - this._totalQuantity) > 1e-9) {
      throw new Error(
        `Broker breakdown sum (${breakdownSum}) must equal total quantity (${this._totalQuantity}).`,
      );
    }
  }

  private calculateTotalQuantity(): number {
    return Array.from(this._brokerBreakdown.values()).reduce((acc, quantity) => acc + quantity, 0);
  }

  private setBrokerQuantity(brokerId: Uuid, quantity: number): void {
    this._brokerBreakdown.set(brokerId.value, quantity);
  }

  private incrementBrokerQuantity(brokerId: Uuid, quantity: number): void {
    const currentBrokerQty = this._brokerBreakdown.get(brokerId.value) ?? 0;
    this._brokerBreakdown.set(brokerId.value, currentBrokerQty + quantity);
  }

  private decrementBrokerQuantity(brokerId: Uuid, quantity: number): void {
    const brokerQty = this._brokerBreakdown.get(brokerId.value) ?? 0;

    if (quantity > brokerQty) {
      throw new Error(
        'Cannot sell more than current quantity allocated to this broker.',
      );
    }

    const newBrokerQty = brokerQty - quantity;
    if (newBrokerQty > 0) {
      this._brokerBreakdown.set(brokerId.value, newBrokerQty);
    } else {
      this._brokerBreakdown.delete(brokerId.value);
    }
  }
}
