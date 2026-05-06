import { TransactionType } from '../../../shared/types/domain';
import type { AssetType } from '../../../shared/types/domain';
import { AssetPosition } from '../../portfolio/domain/entities/asset-position.entity';
import type { BrokerAllocation } from '../../portfolio/domain/entities/asset-position.entity';
import type { Transaction } from '../../portfolio/domain/entities/transaction.entity';
import { Money } from '../../portfolio/domain/value-objects/money.vo';
import { Quantity } from '../../portfolio/domain/value-objects/quantity.vo';
import { Uuid } from '../../shared/domain/value-objects/uuid.vo';

const FRACTION_SOURCE_LABELS = new Map<TransactionType, string>([
  [TransactionType.Bonus, 'bonificacao'],
  [TransactionType.Split, 'split'],
  [TransactionType.ReverseSplit, 'grupamento'],
]);

const PROJECTION_RELEVANT_TYPES = new Set<TransactionType>([
  TransactionType.Bonus,
  TransactionType.Split,
  TransactionType.ReverseSplit,
  TransactionType.FractionAuction,
]);

export type ReportFractionSource = {
  eventType: string;
  date: string;
};

export type ReportFractionInfo = {
  quantity: number;
  sources: ReportFractionSource[];
};

type ProjectInput = {
  persistedPosition: AssetPosition;
  assetType: AssetType;
  year: number;
  transactions: Transaction[];
};

export type ProjectedReportPosition = {
  position: AssetPosition;
  fractionInfo: ReportFractionInfo | null;
};

export class ReportPositionProjectionService {
  project(input: ProjectInput): ProjectedReportPosition {
    const cutoff = `${input.year}-12-31`;
    const transactions = this.orderTransactions(
      input.transactions.filter((transaction) => transaction.date <= cutoff),
    );

    if (transactions.length === 0 || !this.hasProjectionRelevantTransaction(transactions)) {
      return {
        position: input.persistedPosition,
        fractionInfo: null,
      };
    }

    const state = ReportPositionProjectionState.create({
      ticker: input.persistedPosition.ticker,
      assetType: input.assetType,
      year: input.year,
    });
    let fractionSources: ReportFractionSource[] = [];
    let hasFractionAuctionInYear = false;

    for (const transaction of transactions) {
      if (transaction.type === TransactionType.FractionAuction) {
        state.floorAllocations();
        fractionSources = [];
        hasFractionAuctionInYear = this.isYear(transaction.date, input.year);
        continue;
      }

      state.apply(transaction);

      const source = this.toFractionSource(transaction);
      if (source && state.hasFraction()) {
        fractionSources = this.appendUniqueSource(fractionSources, source);
      }
    }

    if (hasFractionAuctionInYear) {
      state.floorAllocations();
      fractionSources = [];
    }

    const position = state.toAssetPosition();
    const fractionQuantity = this.getFractionQuantity(position.totalQuantity);

    return {
      position,
      fractionInfo:
        fractionQuantity > 0 && fractionSources.length > 0
          ? {
              quantity: fractionQuantity,
              sources: fractionSources,
            }
          : null,
    };
  }

  private toFractionSource(transaction: Transaction): ReportFractionSource | null {
    const eventType = FRACTION_SOURCE_LABELS.get(transaction.type);
    if (!eventType) {
      return null;
    }

    return { eventType, date: transaction.date };
  }

  private hasProjectionRelevantTransaction(transactions: Transaction[]): boolean {
    return transactions.some((transaction) => PROJECTION_RELEVANT_TYPES.has(transaction.type));
  }

  private appendUniqueSource(
    sources: ReportFractionSource[],
    nextSource: ReportFractionSource,
  ): ReportFractionSource[] {
    const alreadyTracked = sources.some(
      (source) => source.eventType === nextSource.eventType && source.date === nextSource.date,
    );

    if (alreadyTracked) {
      return sources;
    }

    return [...sources, nextSource];
  }

  private getFractionQuantity(quantity: Quantity): number {
    return quantity.subtract(quantity.floor()).toNumber();
  }

  private isYear(date: string, year: number): boolean {
    return date.slice(0, 4) === String(year);
  }

  private orderTransactions(transactions: Transaction[]): Transaction[] {
    return [...transactions].sort((left, right) => {
      const dateOrder = left.date.localeCompare(right.date);
      if (dateOrder !== 0) {
        return dateOrder;
      }

      if (left.isInitialBalance() === right.isInitialBalance()) {
        return 0;
      }

      return left.isInitialBalance() ? -1 : 1;
    });
  }
}

class ReportPositionProjectionState {
  private readonly allocations = new Map<string, Quantity>();
  private totalQuantity = Quantity.from(0);
  private averagePrice = Money.from(0);

  private constructor(
    private readonly ticker: string,
    private readonly assetType: AssetType,
    private readonly year: number,
  ) {}

  static create(input: { ticker: string; assetType: AssetType; year: number }) {
    return new ReportPositionProjectionState(input.ticker, input.assetType, input.year);
  }

  apply(transaction: Transaction): void {
    switch (transaction.type) {
      case TransactionType.Buy:
        this.applyBuy(transaction);
        break;
      case TransactionType.Sell:
        this.decrement(transaction.brokerId, transaction.quantity);
        this.totalQuantity = this.totalQuantity.subtract(transaction.quantity);
        break;
      case TransactionType.Bonus:
        this.applyBonus(transaction);
        break;
      case TransactionType.TransferOut:
        this.decrement(transaction.brokerId, transaction.quantity);
        this.totalQuantity = this.totalQuantity.subtract(transaction.quantity);
        break;
      case TransactionType.TransferIn:
        this.increment(transaction.brokerId, transaction.quantity);
        this.totalQuantity = this.totalQuantity.add(transaction.quantity);
        break;
      case TransactionType.Split:
        this.applyRatio((quantity) => quantity.multiplyBy(transaction.quantity.getAmount()));
        break;
      case TransactionType.ReverseSplit:
        this.applyRatio((quantity) => quantity.divideBy(transaction.quantity.getAmount()));
        break;
      case TransactionType.InitialBalance:
        this.allocations.clear();
        this.increment(transaction.brokerId, transaction.quantity);
        this.totalQuantity = transaction.quantity;
        this.averagePrice = transaction.unitPrice;
        break;
      case TransactionType.FractionAuction:
        break;
      /* istanbul ignore next -- compile-time exhaustiveness guard for future enum expansion. */
      default: {
        const _exhaustive: never = transaction.type;
        throw new Error(`Unsupported transaction type: ${String(_exhaustive)}`);
      }
    }
  }

  floorAllocations(): void {
    this.applyRatio((quantity) => quantity.floor());
  }

  hasFraction(): boolean {
    return !this.totalQuantity.subtract(this.totalQuantity.floor()).isZero();
  }

  toAssetPosition(): AssetPosition {
    return AssetPosition.restore({
      ticker: this.ticker,
      assetType: this.assetType,
      year: this.year,
      totalQuantity: this.totalQuantity,
      averagePrice: this.averagePrice,
      brokerBreakdown: this.toBrokerBreakdown(),
    });
  }

  private applyBuy(transaction: Transaction): void {
    const currentTotalCost = this.totalCost();
    const buyCost = transaction.unitPrice.multiplyBy(transaction.quantity.getAmount());
    const nextTotalCost = currentTotalCost.add(buyCost).add(transaction.fees);
    const nextQuantity = this.totalQuantity.add(transaction.quantity);

    this.increment(transaction.brokerId, transaction.quantity);
    this.totalQuantity = nextQuantity;
    this.averagePrice = nextTotalCost.divideBy(nextQuantity.getAmount());
  }

  private applyBonus(transaction: Transaction): void {
    const currentTotalCost = this.totalCost();
    const bonusCost = transaction.unitPrice.multiplyBy(transaction.quantity.getAmount());
    const nextTotalCost = currentTotalCost.add(bonusCost);
    const nextQuantity = this.totalQuantity.add(transaction.quantity);

    this.increment(transaction.brokerId, transaction.quantity);
    this.totalQuantity = nextQuantity;
    this.averagePrice = nextTotalCost.divideBy(nextQuantity.getAmount());
  }

  private applyRatio(transform: (quantity: Quantity) => Quantity): void {
    const currentTotalCost = this.totalCost();

    for (const [brokerId, quantity] of this.allocations.entries()) {
      const nextQuantity = transform(quantity);
      if (nextQuantity.isZero()) {
        this.allocations.delete(brokerId);
        continue;
      }

      this.allocations.set(brokerId, nextQuantity);
    }

    this.totalQuantity = this.calculateTotalQuantity();
    this.averagePrice = this.totalQuantity.isZero()
      ? Money.from(0)
      : currentTotalCost.divideBy(this.totalQuantity.getAmount());
  }

  private increment(brokerId: Uuid, quantity: Quantity): void {
    const currentQuantity = this.allocations.get(brokerId.value) ?? Quantity.from(0);
    this.allocations.set(brokerId.value, currentQuantity.add(quantity));
  }

  private decrement(brokerId: Uuid, quantity: Quantity): void {
    const currentQuantity = this.allocations.get(brokerId.value) ?? Quantity.from(0);
    const nextQuantity = currentQuantity.subtract(quantity);

    if (nextQuantity.isZero()) {
      this.allocations.delete(brokerId.value);
      return;
    }

    this.allocations.set(brokerId.value, nextQuantity);
  }

  private totalCost(): Money {
    return this.averagePrice.multiplyBy(this.totalQuantity.getAmount());
  }

  private calculateTotalQuantity(): Quantity {
    return [...this.allocations.values()].reduce(
      (total, quantity) => total.add(quantity),
      Quantity.from(0),
    );
  }

  private toBrokerBreakdown(): BrokerAllocation[] {
    return [...this.allocations.entries()].map(([brokerId, quantity]) => ({
      brokerId: Uuid.from(brokerId),
      quantity,
    }));
  }
}
