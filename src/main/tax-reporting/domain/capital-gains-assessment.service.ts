import {
  CapitalGainsBlockerCode,
  CapitalGainsTraceClassification,
  TransactionType,
} from '../../../shared/types/domain';
import type {
  AssessmentBlockerOutput,
  SaleTraceOutput,
} from '../application/use-cases/generate-capital-gains-assessment/generate-capital-gains-assessment.output';
import type {
  CapitalGainsAssessmentFacts,
  CapitalGainsAssessmentTransactionFact,
} from '../application/queries/capital-gains-assessment.query';
import { Money } from '../../portfolio/domain/value-objects/money.vo';
import { Quantity } from '../../portfolio/domain/value-objects/quantity.vo';

export interface CapitalGainsSaleAssessment {
  saleTraces: SaleTraceOutput[];
  blockers: AssessmentBlockerOutput[];
}

type PositionState = {
  quantity: Quantity;
  averageCost: Money;
};

type DayTradeKey = string;

export class CapitalGainsAssessmentService {
  assess(facts: CapitalGainsAssessmentFacts): CapitalGainsSaleAssessment {
    const feesByTransaction = this.groupFeesByTransaction(facts);
    const dayTradeKeys = this.findDayTradeKeys(facts.transactions);
    const positions = new Map<string, PositionState>();
    const saleTraces: SaleTraceOutput[] = [];
    const blockers: AssessmentBlockerOutput[] = [];

    for (const transaction of this.orderTransactions(facts.transactions)) {
      const classificationBlocker = this.getClassificationBlocker(transaction);
      if (classificationBlocker) {
        if (this.isBaseYearTransaction(transaction, facts.baseYear)) {
          blockers.push(classificationBlocker);
        }
        continue;
      }

      if (this.isDayTradeTransaction(transaction, dayTradeKeys)) {
        if (this.isBaseYearTransaction(transaction, facts.baseYear)) {
          blockers.push(
            this.createBlocker({
              transaction,
              code: CapitalGainsBlockerCode.DayTradeUnsupported,
              message: 'Day trade operations are unsupported in V1.',
            }),
          );
        }
        continue;
      }

      const fees = feesByTransaction.get(transaction.id) ?? Money.from(0);
      const position = this.getPosition(positions, transaction.ticker);
      const scopedBlockers = this.isBaseYearTransaction(transaction, facts.baseYear)
        ? blockers
        : [];
      const nextTrace = this.applyTransaction({
        transaction,
        position,
        fees,
        blockers: scopedBlockers,
      });

      if (nextTrace && this.isBaseYearTransaction(transaction, facts.baseYear)) {
        saleTraces.push(nextTrace);
      }
    }

    return {
      saleTraces,
      blockers,
    };
  }

  private applyTransaction(input: {
    transaction: CapitalGainsAssessmentTransactionFact;
    position: PositionState;
    fees: Money;
    blockers: AssessmentBlockerOutput[];
  }): SaleTraceOutput | null {
    const { transaction, position, fees, blockers } = input;

    if (!this.hasPositiveQuantity(transaction)) {
      blockers.push(
        this.createBlocker({
          transaction,
          code: CapitalGainsBlockerCode.MissingTransactionData,
          message: 'Transaction quantity must be greater than zero.',
        }),
      );
      return null;
    }

    switch (transaction.transactionType) {
      case TransactionType.InitialBalance:
        this.applyInitialBalance(position, transaction);
        return null;
      case TransactionType.Buy:
        this.applyBuy({ position, transaction, fees });
        return null;
      case TransactionType.Sell:
        return this.applySaleLikeTransaction({ position, transaction, fees, blockers });
      case TransactionType.Bonus:
        this.applyBonus(position, transaction);
        return null;
      case TransactionType.Split:
        this.applySplit({ position, transaction, blockers });
        return null;
      case TransactionType.ReverseSplit:
        this.applyReverseSplit({ position, transaction, blockers });
        return null;
      case TransactionType.TransferIn:
        this.applyTransferIn({ position, transaction, fees, blockers });
        return null;
      case TransactionType.TransferOut:
        this.applyTransferOut({ position, transaction, blockers });
        return null;
      case TransactionType.FractionAuction:
        return this.applySaleLikeTransaction({ position, transaction, fees, blockers });
      default: {
        const _exhaustive: never = transaction.transactionType;
        throw new Error(`Unsupported transaction type: ${String(_exhaustive)}`);
      }
    }
  }

  private applyInitialBalance(
    position: PositionState,
    transaction: CapitalGainsAssessmentTransactionFact,
  ): void {
    const currentCost = this.totalCost(position);
    const initialQuantity = Quantity.from(transaction.quantity);
    const initialCost = Money.from(transaction.unitPrice).multiplyBy(initialQuantity.getAmount());
    const nextQuantity = position.quantity.add(initialQuantity);
    const nextCost = currentCost.add(initialCost);

    position.quantity = nextQuantity;
    position.averageCost = nextCost.divideBy(nextQuantity.getAmount());
  }

  private applyBuy(input: {
    position: PositionState;
    transaction: CapitalGainsAssessmentTransactionFact;
    fees: Money;
  }): void {
    const currentCost = this.totalCost(input.position);
    const buyCost = Money.from(input.transaction.grossValue).add(input.fees);
    const nextQuantity = input.position.quantity.add(Quantity.from(input.transaction.quantity));
    const nextCost = currentCost.add(buyCost);

    input.position.quantity = nextQuantity;
    input.position.averageCost = nextCost.divideBy(nextQuantity.getAmount());
  }

  private applySaleLikeTransaction(input: {
    position: PositionState;
    transaction: CapitalGainsAssessmentTransactionFact;
    fees: Money;
    blockers: AssessmentBlockerOutput[];
  }): SaleTraceOutput | null {
    const { position, transaction, fees, blockers } = input;
    const saleQuantity = Quantity.from(transaction.quantity);
    const category = transaction.category;

    if (!category) {
      throw new Error('Sale-like transactions must have a supported category.');
    }

    if (position.quantity.isZero()) {
      blockers.push(
        this.createBlocker({
          transaction,
          code: CapitalGainsBlockerCode.MissingCostBasis,
          message: 'Cannot assess sale without an existing cost basis.',
        }),
      );
      return null;
    }

    if (!saleQuantity.isLessThanOrEqualTo(position.quantity.getAmount())) {
      blockers.push(
        this.createBlocker({
          transaction,
          code: CapitalGainsBlockerCode.AmbiguousCostBasis,
          message: 'Sale quantity exceeds the available position quantity.',
        }),
      );
      return null;
    }

    const averageCostBeforeSale = position.averageCost;
    const saleGrossProceeds = Money.from(transaction.grossValue);
    const saleNetProceeds = saleGrossProceeds.subtract(fees);
    const costBasis = averageCostBeforeSale.multiplyBy(saleQuantity.getAmount());
    const grossResult = saleNetProceeds.subtract(costBasis);
    const nextQuantity = position.quantity.subtract(saleQuantity);

    position.quantity = nextQuantity;
    position.averageCost = nextQuantity.isZero() ? Money.from(0) : averageCostBeforeSale;

    return {
      sourceTransactionId: transaction.id,
      date: transaction.date,
      ticker: transaction.ticker,
      category,
      saleQuantity: saleQuantity.toNumber(),
      saleProceeds: saleGrossProceeds.toNumber(),
      acquisitionCostBasis: costBasis.toNumber(),
      feesConsidered: fees.toNumber(),
      averageCostBeforeSale: averageCostBeforeSale.toNumber(),
      averageCostAfterSale: position.averageCost.toNumber(),
      grossResult: grossResult.toNumber(),
      exemptAmount: 0,
      taxableAmount: grossResult.isGreaterThan(0) ? grossResult.toNumber() : 0,
      lossGenerated: grossResult.isNegative() ? grossResult.multiplyBy(-1).toNumber() : 0,
      compensatedLossAmount: 0,
      remainingCategoryLossBalance: 0,
      classification: grossResult.isNegative()
        ? CapitalGainsTraceClassification.Loss
        : CapitalGainsTraceClassification.TaxableGain,
    };
  }

  private applyBonus(
    position: PositionState,
    transaction: CapitalGainsAssessmentTransactionFact,
  ): void {
    const currentCost = this.totalCost(position);
    const bonusCost = Money.from(transaction.grossValue);
    const nextQuantity = position.quantity.add(Quantity.from(transaction.quantity));
    const nextCost = currentCost.add(bonusCost);

    position.quantity = nextQuantity;
    position.averageCost = nextCost.divideBy(nextQuantity.getAmount());
  }

  private applySplit(input: {
    position: PositionState;
    transaction: CapitalGainsAssessmentTransactionFact;
    blockers: AssessmentBlockerOutput[];
  }): void {
    if (input.transaction.quantity <= 0) {
      input.blockers.push(
        this.createBlocker({
          transaction: input.transaction,
          code: CapitalGainsBlockerCode.MissingTransactionData,
          message: 'Split ratio must be greater than zero.',
        }),
      );
      return;
    }

    this.applyQuantityChange(input.position, (quantity) =>
      quantity.multiplyBy(input.transaction.quantity),
    );
  }

  private applyReverseSplit(input: {
    position: PositionState;
    transaction: CapitalGainsAssessmentTransactionFact;
    blockers: AssessmentBlockerOutput[];
  }): void {
    if (input.transaction.quantity <= 0) {
      input.blockers.push(
        this.createBlocker({
          transaction: input.transaction,
          code: CapitalGainsBlockerCode.MissingTransactionData,
          message: 'Reverse split ratio must be greater than zero.',
        }),
      );
      return;
    }

    this.applyQuantityChange(input.position, (quantity) =>
      quantity.divideBy(input.transaction.quantity),
    );
  }

  private applyTransferIn(input: {
    position: PositionState;
    transaction: CapitalGainsAssessmentTransactionFact;
    fees: Money;
    blockers: AssessmentBlockerOutput[];
  }): void {
    const transferQuantity = Quantity.from(input.transaction.quantity);
    const currentCost = this.totalCost(input.position);
    const transferCost = this.resolveTransferInCost(input);

    if (!transferCost) {
      input.blockers.push(
        this.createBlocker({
          transaction: input.transaction,
          code: CapitalGainsBlockerCode.MissingCostBasis,
          message: 'Transfer-in needs source cost data when no cost basis exists.',
        }),
      );
      return;
    }

    const nextQuantity = input.position.quantity.add(transferQuantity);
    const nextCost = currentCost.add(transferCost);

    input.position.quantity = nextQuantity;
    input.position.averageCost = nextCost.divideBy(nextQuantity.getAmount());
  }

  private applyTransferOut(input: {
    position: PositionState;
    transaction: CapitalGainsAssessmentTransactionFact;
    blockers: AssessmentBlockerOutput[];
  }): void {
    const transferQuantity = Quantity.from(input.transaction.quantity);

    if (!transferQuantity.isLessThanOrEqualTo(input.position.quantity.getAmount())) {
      input.blockers.push(
        this.createBlocker({
          transaction: input.transaction,
          code: CapitalGainsBlockerCode.AmbiguousCostBasis,
          message: 'Transfer-out quantity exceeds the available position quantity.',
        }),
      );
      return;
    }

    const nextQuantity = input.position.quantity.subtract(transferQuantity);
    input.position.quantity = nextQuantity;
    input.position.averageCost = nextQuantity.isZero() ? Money.from(0) : input.position.averageCost;
  }

  private resolveTransferInCost(input: {
    position: PositionState;
    transaction: CapitalGainsAssessmentTransactionFact;
    fees: Money;
  }): Money | null {
    if (input.transaction.unitPrice > 0 || input.transaction.grossValue > 0) {
      return Money.from(input.transaction.grossValue).add(input.fees);
    }

    if (!input.position.quantity.isZero()) {
      return input.position.averageCost.multiplyBy(input.transaction.quantity);
    }

    return null;
  }

  private applyQuantityChange(
    position: PositionState,
    transform: (quantity: Quantity) => Quantity,
  ): void {
    const currentCost = this.totalCost(position);
    const nextQuantity = transform(position.quantity);

    position.quantity = nextQuantity;
    position.averageCost = nextQuantity.isZero()
      ? Money.from(0)
      : currentCost.divideBy(nextQuantity.getAmount());
  }

  private getClassificationBlocker(
    transaction: CapitalGainsAssessmentTransactionFact,
  ): AssessmentBlockerOutput | null {
    if (!transaction.assetType) {
      return this.createBlocker({
        transaction,
        code: CapitalGainsBlockerCode.MissingAssetCategory,
        message: 'Asset category is missing for this transaction.',
      });
    }

    if (!transaction.category) {
      return this.createBlocker({
        transaction,
        code: CapitalGainsBlockerCode.UnsupportedAssetType,
        message: 'Asset type is unsupported for capital gains assessment.',
      });
    }

    return null;
  }

  private groupFeesByTransaction(facts: CapitalGainsAssessmentFacts): Map<string, Money> {
    return facts.fees.reduce((groupedFees, fee) => {
      const currentFees = groupedFees.get(fee.transactionId) ?? Money.from(0);
      groupedFees.set(fee.transactionId, currentFees.add(Money.from(fee.amount)));
      return groupedFees;
    }, new Map<string, Money>());
  }

  private findDayTradeKeys(
    transactions: CapitalGainsAssessmentTransactionFact[],
  ): Set<DayTradeKey> {
    const groupedTypes = new Map<DayTradeKey, Set<TransactionType>>();

    for (const transaction of transactions) {
      if (
        transaction.transactionType !== TransactionType.Buy &&
        transaction.transactionType !== TransactionType.Sell
      ) {
        continue;
      }

      const key = this.toDayTradeKey(transaction);
      const types = groupedTypes.get(key) ?? new Set<TransactionType>();
      types.add(transaction.transactionType);
      groupedTypes.set(key, types);
    }

    return new Set(
      [...groupedTypes.entries()]
        .filter(([, types]) => types.has(TransactionType.Buy) && types.has(TransactionType.Sell))
        .map(([key]) => key),
    );
  }

  private isDayTradeTransaction(
    transaction: CapitalGainsAssessmentTransactionFact,
    dayTradeKeys: Set<DayTradeKey>,
  ): boolean {
    const isOrdinaryBuyOrSell =
      transaction.transactionType === TransactionType.Buy ||
      transaction.transactionType === TransactionType.Sell;

    return isOrdinaryBuyOrSell && dayTradeKeys.has(this.toDayTradeKey(transaction));
  }

  private toDayTradeKey(transaction: CapitalGainsAssessmentTransactionFact): DayTradeKey {
    return `${transaction.date}:${transaction.ticker}`;
  }

  private orderTransactions(
    transactions: CapitalGainsAssessmentTransactionFact[],
  ): CapitalGainsAssessmentTransactionFact[] {
    return [...transactions].sort((left, right) => {
      const dateOrder = left.date.localeCompare(right.date);
      if (dateOrder !== 0) {
        return dateOrder;
      }

      const typeOrder = this.getTransactionOrder(left).localeCompare(
        this.getTransactionOrder(right),
      );
      if (typeOrder !== 0) {
        return typeOrder;
      }

      return left.id.localeCompare(right.id);
    });
  }

  private getTransactionOrder(transaction: CapitalGainsAssessmentTransactionFact): string {
    if (transaction.transactionType === TransactionType.InitialBalance) {
      return '0';
    }

    if (transaction.transactionType === TransactionType.Buy) {
      return '1';
    }

    return '2';
  }

  private getPosition(positions: Map<string, PositionState>, ticker: string): PositionState {
    const position = positions.get(ticker);
    if (position) {
      return position;
    }

    const nextPosition = {
      quantity: Quantity.from(0),
      averageCost: Money.from(0),
    };
    positions.set(ticker, nextPosition);
    return nextPosition;
  }

  private hasPositiveQuantity(transaction: CapitalGainsAssessmentTransactionFact): boolean {
    return transaction.quantity > 0;
  }

  private totalCost(position: PositionState): Money {
    return position.averageCost.multiplyBy(position.quantity.getAmount());
  }

  private createBlocker(input: {
    transaction: CapitalGainsAssessmentTransactionFact;
    code: CapitalGainsBlockerCode;
    message: string;
  }): AssessmentBlockerOutput {
    return {
      code: input.code,
      message: input.message,
      month: input.transaction.date.slice(0, 7),
      ticker: input.transaction.ticker,
      category: input.transaction.category,
      sourceTransactionId: input.transaction.id,
      operationType: input.transaction.transactionType,
    };
  }

  private isBaseYearTransaction(
    transaction: CapitalGainsAssessmentTransactionFact,
    baseYear: number,
  ): boolean {
    return transaction.date.slice(0, 4) === String(baseYear);
  }
}
