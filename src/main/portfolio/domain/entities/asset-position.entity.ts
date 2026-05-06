import type { AssetType } from '../../../shared/types/domain';
import { YEAR_RANGE } from '../../../../shared/utils/year';
import type { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { AveragePriceService } from '../services/average-price.service';
import { PositionBrokerAllocation } from './position-broker-allocation';
import { Money } from '../value-objects/money.vo';
import { Quantity } from '../value-objects/quantity.vo';

export type BrokerAllocation = {
  brokerId: Uuid;
  quantity: Quantity;
};

export interface AssetPositionProps {
  ticker: string;
  assetType: AssetType;
  totalQuantity: Quantity;
  averagePrice: Money;
  brokerBreakdown: BrokerAllocation[];
  year: number;
}

interface RestoreAssetPositionProps {
  ticker: string;
  assetType: AssetType;
  year: number;
  totalQuantity: Quantity;
  averagePrice: Money;
  brokerBreakdown: BrokerAllocation[];
}

interface CreateAssetPositionProps {
  ticker: string;
  assetType: AssetType;
  year: number;
  totalQuantity?: Quantity;
  averagePrice?: Money;
  brokerBreakdown?: BrokerAllocation[];
}

interface ApplyOperationInput {
  quantity: Quantity;
  brokerId: Uuid;
}

interface ApplyBuyInput extends ApplyOperationInput {
  unitPrice: Money;
  fees?: Money;
}

type ApplySellInput = ApplyOperationInput;

interface ApplyBonusInput extends ApplyOperationInput {
  unitCost: Money;
}

type ApplyTransferOutInput = ApplyOperationInput;

type ApplyTransferInInput = ApplyOperationInput;

interface ApplyInitialBalanceInput extends ApplyOperationInput {
  averagePrice: Money;
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
  private _totalQuantity: Quantity;
  private _averagePrice: Money;
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
      totalQuantity: props.totalQuantity ?? Quantity.from(0),
      averagePrice: props.averagePrice ?? Money.from(0),
      brokerBreakdown: props.brokerBreakdown ?? [],
      year: props.year,
    });
  }

  static restore(props: RestoreAssetPositionProps): AssetPosition {
    return new AssetPosition(props);
  }

  applyBuy(input: ApplyBuyInput): void {
    this.assertPositiveQuantity(input.quantity, 'Buy quantity must be greater than zero.');

    const nextQuantity = this._totalQuantity.add(input.quantity);
    const nextAveragePrice = this.averagePriceService.calculateAfterBuy(this, {
      buyQuantity: input.quantity,
      buyUnitPrice: input.unitPrice,
      operationalCosts: input.fees ?? Money.from(0),
    });

    this.brokerBreakdownState.increment(input.brokerId, input.quantity);
    this.commitQuantityAndAveragePrice(nextQuantity, nextAveragePrice);
  }

  applySell(input: ApplySellInput): void {
    this.assertPositiveQuantity(input.quantity, 'Sell quantity must be greater than zero.');
    if (this._totalQuantity.isZero()) {
      throw new Error('Cannot sell asset without an open position.');
    }

    this.brokerBreakdownState.decrement(input.brokerId, input.quantity);
    this.commitQuantityAndAveragePrice(
      this._totalQuantity.subtract(input.quantity),
      this._averagePrice,
    );
  }

  applyBonus(input: ApplyBonusInput): void {
    this.assertPositiveQuantity(input.quantity, 'Bonus quantity must be greater than zero.');

    const creditedQuantity = input.quantity.floor();
    const nextQuantity = this._totalQuantity.add(creditedQuantity);
    const nextAveragePrice = this.averagePriceService.calculateAfterBonus(
      this,
      input.quantity,
      input.unitCost,
    );

    if (!creditedQuantity.isZero()) {
      this.brokerBreakdownState.increment(input.brokerId, creditedQuantity);
    }
    this.commitQuantityAndAveragePrice(nextQuantity, nextAveragePrice);
  }

  applyTransferOut(input: ApplyTransferOutInput): void {
    this.assertPositiveQuantity(input.quantity, 'Transfer quantity must be greater than zero.');

    this.brokerBreakdownState.decrement(input.brokerId, input.quantity);
    this.commitQuantityAndAveragePrice(
      this._totalQuantity.subtract(input.quantity),
      this._averagePrice,
    );
  }

  applyTransferIn(input: ApplyTransferInInput): void {
    this.assertPositiveQuantity(input.quantity, 'Transfer quantity must be greater than zero.');

    this.brokerBreakdownState.increment(input.brokerId, input.quantity);
    this.commitQuantityAndAveragePrice(this._totalQuantity.add(input.quantity), this._averagePrice);
  }

  applyInitialBalance(input: ApplyInitialBalanceInput): void {
    this.assertPositiveQuantity(
      input.quantity,
      'Initial balance quantity must be greater than zero.',
    );
    if (input.averagePrice.isLessThanOrEqualTo(0)) {
      throw new Error('Initial balance average price must be greater than zero.');
    }

    this.brokerBreakdownState.replaceWith(input.brokerId, input.quantity);
    this.commitQuantityAndAveragePrice(this.calculateTotalQuantity(), input.averagePrice);
  }

  applySplit(input: ApplySplitInput): void {
    if (input.ratio <= 0) {
      throw new Error('Split ratio must be greater than zero.');
    }

    this.applyCorporateAction((quantity) => quantity.multiplyBy(input.ratio).floor());
  }

  applyReverseSplit(input: ApplyReverseSplitInput): void {
    if (input.ratio <= 0) {
      throw new Error('Reverse Split ratio must be greater than zero.');
    }

    this.applyCorporateAction((quantity) => quantity.divideBy(input.ratio).floor());
  }

  get totalQuantity(): Quantity {
    return this._totalQuantity;
  }

  get averagePrice(): Money {
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

  get totalCost(): Money {
    return this._averagePrice.multiplyBy(this._totalQuantity.getAmount());
  }

  private validate(): void {
    if (this._year < MIN_SUPPORTED_YEAR) {
      throw new Error(`Year must be greater than or equal to ${MIN_SUPPORTED_YEAR}.`);
    }

    if (this._averagePrice.isNegative()) {
      throw new Error('Average price cannot be negative.');
    }

    const breakdownSum = this.brokerBreakdownState.total();
    if (!breakdownSum.subtract(this._totalQuantity).isZero()) {
      throw new Error(
        `Broker breakdown sum (${breakdownSum.getAmount()}) must equal total quantity (${this._totalQuantity.getAmount()}).`,
      );
    }
  }

  private calculateTotalQuantity(): Quantity {
    return this.brokerBreakdownState.total();
  }

  private applyCorporateAction(transform: (quantity: Quantity) => Quantity): void {
    this.brokerBreakdownState.applyRatio(transform);
    const nextTotalQuantity = this.calculateTotalQuantity();
    const nextAveragePrice = this.averagePriceService.calculateAfterQuantityChange(
      this,
      nextTotalQuantity,
    );
    this.commitQuantityAndAveragePrice(nextTotalQuantity, nextAveragePrice);
  }

  private commitQuantityAndAveragePrice(totalQuantity: Quantity, averagePrice: Money): void {
    this._totalQuantity = totalQuantity;
    this._averagePrice = averagePrice;
    this.validate();
  }

  private assertPositiveQuantity(quantity: Quantity, errorMessage: string): void {
    if (quantity.isLessThanOrEqualTo(0)) {
      throw new Error(errorMessage);
    }
  }
}
