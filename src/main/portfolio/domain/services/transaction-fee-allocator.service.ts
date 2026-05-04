import { TransactionType } from '../../../../shared/types/domain';
import type { Transaction } from '../entities/transaction.entity';
import { TransactionFee } from '../entities/transaction-fee.entity';
import { Money } from '../value-objects/money.vo';

type TransactionFeeAllocatorOperation = {
  quantity: number;
  unitPrice: Money;
  type?: TransactionType;
};

type TransactionFeeAllocatorInput = {
  totalOperationalCosts: Money;
  operations: TransactionFeeAllocatorOperation[];
};

export class TransactionFeeAllocator {
  allocate(input: TransactionFeeAllocatorInput): Money[] {
    this.validate(input);

    const totalOperationalCosts = input.totalOperationalCosts.roundToCurrency();
    const eligibleOperations = input.operations
      .map((operation, index) => ({
        index,
        operation,
        weight: operation.unitPrice.multiplyBy(operation.quantity),
      }))
      .filter(
        (item) =>
          item.operation.type !== TransactionType.InitialBalance &&
          item.operation.type !== TransactionType.FractionAuction,
      );

    if (totalOperationalCosts.isZero() || eligibleOperations.length === 0) {
      return input.operations.map(() => Money.from(0));
    }

    const operationWeights = eligibleOperations.map((operation) => operation.weight);
    const totalWeight = operationWeights.reduce(
      (accumulator, currentWeight) => accumulator.add(currentWeight),
      Money.from(0),
    );

    const allocatedEligibleCosts = totalWeight.isZero()
      ? this.allocateByEvenSplit(totalOperationalCosts, eligibleOperations.length)
      : this.allocateByLargestRemainder({
          totalOperationalCosts,
          operationWeights,
          totalWeight,
        });

    return this.mergeEligibleAllocations(
      input.operations.length,
      eligibleOperations,
      allocatedEligibleCosts,
    );
  }

  allocateForTransactions(input: {
    totalOperationalCosts: Money;
    transactions: Transaction[];
  }): TransactionFee[] {
    const allocations = this.allocate({
      totalOperationalCosts: input.totalOperationalCosts,
      operations: input.transactions.map((transaction) => ({
        quantity: transaction.quantity.toNumber(),
        unitPrice: transaction.unitPrice,
        type: transaction.type,
      })),
    });

    return input.transactions
      .map((transaction, index) => ({
        transaction,
        totalFees: allocations[index] ?? Money.from(0),
      }))
      .filter(({ transaction }) => !transaction.isInitialBalance())
      .map(({ transaction, totalFees }) =>
        TransactionFee.create({
          transactionId: transaction.id,
          totalFees,
        }),
      );
  }

  private mergeEligibleAllocations(
    operationCount: number,
    eligibleOperations: Array<{ index: number }>,
    allocatedEligibleCosts: Money[],
  ): Money[] {
    const allocations = Array.from({ length: operationCount }, () => Money.from(0));

    eligibleOperations.forEach((operation, eligibleIndex) => {
      allocations[operation.index] = allocatedEligibleCosts[eligibleIndex] ?? Money.from(0);
    });

    return allocations;
  }

  private allocateByLargestRemainder(input: {
    totalOperationalCosts: Money;
    operationWeights: Money[];
    totalWeight: Money;
  }): Money[] {
    const baseAllocations: Money[] = [];
    const remainders: Array<{ index: number; remainder: Money }> = [];

    for (const [index, operationWeight] of input.operationWeights.entries()) {
      const weightedShare = input.totalOperationalCosts
        .multiplyBy(operationWeight.getAmount())
        .divideBy(input.totalWeight.getAmount());
      const baseAllocation = weightedShare.floorToCurrency();
      const remainder = weightedShare.subtract(baseAllocation);

      baseAllocations.push(baseAllocation);
      remainders.push({ index, remainder });
    }

    const sortedRemainders = [...remainders].sort((left, right) => {
      if (left.remainder.getAmount() === right.remainder.getAmount()) {
        return left.index - right.index;
      }

      return right.remainder.isGreaterThan(left.remainder) ? 1 : -1;
    });

    return this.distributeRemainingCurrency(
      input.totalOperationalCosts,
      baseAllocations,
      sortedRemainders,
    );
  }

  private allocateByEvenSplit(totalOperationalCosts: Money, operationCount: number): Money[] {
    const baseAllocation = totalOperationalCosts.divideBy(operationCount).floorToCurrency();
    const allocations = Array.from({ length: operationCount }, () => baseAllocation);
    const remainders = allocations.map((_, index) => ({
      index,
      remainder: Money.from(0),
    }));

    return this.distributeRemainingCurrency(totalOperationalCosts, allocations, remainders);
  }

  private distributeRemainingCurrency(
    totalOperationalCosts: Money,
    baseAllocations: Money[],
    remainders: Array<{ index: number; remainder: Money }>,
  ): Money[] {
    const minimumCurrencyUnit = Money.minimumCurrencyUnit();
    const allocatedTotal = baseAllocations.reduce(
      (accumulator, allocation) => accumulator.add(allocation),
      Money.from(0),
    );
    let remaining = totalOperationalCosts.subtract(allocatedTotal).roundToCurrency();

    for (const item of remainders) {
      if (remaining.isLessThanOrEqualTo(0)) {
        break;
      }

      const currentValue = baseAllocations[item.index];
      baseAllocations[item.index] = currentValue.add(minimumCurrencyUnit);
      remaining = remaining.subtract(minimumCurrencyUnit).roundToCurrency();
    }

    return baseAllocations;
  }

  private validate(input: TransactionFeeAllocatorInput): void {
    if (input.totalOperationalCosts.isNegative()) {
      throw new Error('Total operational costs cannot be negative.');
    }

    if (input.operations.length === 0) {
      throw new Error('At least one operation is required for allocation.');
    }

    for (const operation of input.operations) {
      if (!Number.isFinite(operation.quantity) || operation.quantity <= 0) {
        throw new Error('Operation quantity must be greater than zero.');
      }

      if (operation.unitPrice.isNegative()) {
        throw new Error('Operation unit price cannot be negative.');
      }
    }
  }
}
