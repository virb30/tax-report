import type { AssetType } from '../../../../shared/types/domain';
import { YEAR_RANGE } from '../../../../shared/utils/year';
import type { Uuid } from '../../shared/uuid.vo';
import { AveragePriceService } from '../services/average-price.service';
import { PositionBrokerAllocation } from './position-broker-allocation';

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
}

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

type ApplySellInput = ApplyOperationInput;

interface ApplyBonusInput extends ApplyOperationInput {
  unitCost: number;
}

type ApplyTransferOutInput = ApplyOperationInput;

type ApplyTransferInInput = ApplyOperationInput;

interface ApplyInitialBalanceInput extends ApplyOperationInput {
  averagePrice: number;
}

interface ApplySplitInput {
  ratio: number;
}

interface ApplyReverseSplitInput {
  ratio: number;
}

export const MIN_SUPPORTED_YEAR = YEAR_RANGE.min;

export class AssetPosition {
  private readonly averagePriceService: AveragePriceService;
  private _totalQuantity: number;
  private _averagePrice: number;
  private readonly brokerBreakdownState: PositionBrokerAllocation;
  private _year: number;

  private constructor(private readonly props: AssetPositionProps) {
    this.averagePriceService = new AveragePriceService();
    this._totalQuantity = props.totalQuantity;
    this._averagePrice = props.averagePrice;
    this.brokerBreakdownState = new PositionBrokerAllocation(props.brokerBreakdown);
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
    this.assertPositiveQuantity(input.quantity, 'Buy quantity must be greater than zero.');

    const nextQuantity = this._totalQuantity + input.quantity;
    const nextAveragePrice = this.averagePriceService.calculateAfterBuy(this, {
      buyQuantity: input.quantity,
      buyUnitPrice: input.unitPrice,
      operationalCosts: input.fees ?? 0,
    });

    this.brokerBreakdownState.increment(input.brokerId, input.quantity);
    this.commitQuantityAndAveragePrice(nextQuantity, nextAveragePrice);
  }

  applySell(input: ApplySellInput): void {
    this.assertPositiveQuantity(input.quantity, 'Sell quantity must be greater than zero.');
    if (this._totalQuantity === 0) {
      throw new Error('Cannot sell asset without an open position.');
    }

    this.brokerBreakdownState.decrement(input.brokerId, input.quantity);
    this.commitQuantityAndAveragePrice(this.totalQuantity - input.quantity, this._averagePrice);
  }

  applyBonus(input: ApplyBonusInput): void {
    this.assertPositiveQuantity(input.quantity, 'Bonus quantity must be greater than zero.');

    const nextQuantity = this._totalQuantity + input.quantity;
    const nextAveragePrice = this.averagePriceService.calculateAfterBonus(
      this,
      input.quantity,
      input.unitCost,
    );

    this.brokerBreakdownState.increment(input.brokerId, input.quantity);
    this.commitQuantityAndAveragePrice(nextQuantity, nextAveragePrice);
  }

  applyTransferOut(input: ApplyTransferOutInput): void {
    this.assertPositiveQuantity(input.quantity, 'Transfer quantity must be greater than zero.');

    this.brokerBreakdownState.decrement(input.brokerId, input.quantity);
    this.commitQuantityAndAveragePrice(this._totalQuantity - input.quantity, this._averagePrice);
  }

  applyTransferIn(input: ApplyTransferInInput): void {
    this.assertPositiveQuantity(input.quantity, 'Transfer quantity must be greater than zero.');

    this.brokerBreakdownState.increment(input.brokerId, input.quantity);
    this.commitQuantityAndAveragePrice(this._totalQuantity + input.quantity, this._averagePrice);
  }

  applyInitialBalance(input: ApplyInitialBalanceInput): void {
    this.assertPositiveQuantity(
      input.quantity,
      'Initial balance quantity must be greater than zero.',
    );
    if (input.averagePrice <= 0) {
      throw new Error('Initial balance average price must be greater than zero.');
    }

    this.brokerBreakdownState.set(input.brokerId, input.quantity);
    this.commitQuantityAndAveragePrice(this.calculateTotalQuantity(), input.averagePrice);
  }

  applySplit(input: ApplySplitInput): void {
    if (input.ratio <= 0) {
      throw new Error('Split ratio must be greater than zero.');
    }

    this.applyCorporateAction((quantity) => quantity * input.ratio);
  }

  applyReverseSplit(input: ApplyReverseSplitInput): void {
    if (input.ratio <= 0) {
      throw new Error('Reverse Split ratio must be greater than zero.');
    }

    this.applyCorporateAction((quantity) => quantity / input.ratio);
  }

  get totalQuantity(): number {
    return this._totalQuantity;
  }

  get averagePrice(): number {
    return this._averagePrice;
  }

  get brokerBreakdown(): BrokerAllocation[] {
    return this.brokerBreakdownState.toArray();
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

    const breakdownSum = this.brokerBreakdownState.total();
    if (Math.abs(breakdownSum - this._totalQuantity) > 1e-9) {
      throw new Error(
        `Broker breakdown sum (${breakdownSum}) must equal total quantity (${this._totalQuantity}).`,
      );
    }
  }

  private calculateTotalQuantity(): number {
    return this.brokerBreakdownState.total();
  }

  private applyCorporateAction(transform: (quantity: number) => number): void {
    this.brokerBreakdownState.applyRatio(transform);
    const nextTotalQuantity = this.calculateTotalQuantity();
    const nextAveragePrice = this.averagePriceService.calculateAfterQuantityChange(
      this,
      nextTotalQuantity,
    );
    this.commitQuantityAndAveragePrice(nextTotalQuantity, nextAveragePrice);
  }

  private commitQuantityAndAveragePrice(totalQuantity: number, averagePrice: number): void {
    this._totalQuantity = totalQuantity;
    this._averagePrice = averagePrice;
    this.validate();
  }

  private assertPositiveQuantity(quantity: number, errorMessage: string): void {
    if (quantity <= 0) {
      throw new Error(errorMessage);
    }
  }
}
