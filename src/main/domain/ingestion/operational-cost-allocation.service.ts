export type OperationalCostAllocationOperation = {
  ticker: string;
  quantity: number;
  unitPrice: number;
};

export type OperationalCostAllocationInput = {
  totalOperationalCosts: number;
  operations: OperationalCostAllocationOperation[];
};

export class OperationalCostAllocationService {
  allocate(input: OperationalCostAllocationInput): number[] {
    this.validate(input);

    const totalOperationalCostCents = this.toCents(input.totalOperationalCosts);
    if (totalOperationalCostCents === 0) {
      return input.operations.map(() => 0);
    }

    const operationWeightsInCents = input.operations.map((operation) =>
      this.toCents(operation.quantity * operation.unitPrice),
    );
    const totalWeightInCents = operationWeightsInCents.reduce(
      (accumulator, currentWeight) => accumulator + currentWeight,
      0,
    );

    if (totalWeightInCents === 0) {
      return this.allocateByEvenSplit(totalOperationalCostCents, input.operations.length);
    }

    return this.allocateByLargestRemainder({
      totalOperationalCostCents,
      operationWeightsInCents,
      totalWeightInCents,
    });
  }

  private allocateByLargestRemainder(input: {
    totalOperationalCostCents: number;
    operationWeightsInCents: number[];
    totalWeightInCents: number;
  }): number[] {
    const baseAllocationsInCents: number[] = [];
    const remainders: Array<{ index: number; remainder: number }> = [];
    let allocatedCents = 0;

    for (const [index, operationWeight] of input.operationWeightsInCents.entries()) {
      const weightedShare = input.totalOperationalCostCents * operationWeight;
      const baseAllocation = Math.floor(weightedShare / input.totalWeightInCents);
      const remainder = weightedShare % input.totalWeightInCents;

      baseAllocationsInCents.push(baseAllocation);
      remainders.push({ index, remainder });
      allocatedCents += baseAllocation;
    }

    let missingCents = input.totalOperationalCostCents - allocatedCents;
    const sortedRemainders = [...remainders].sort((left, right) => {
      if (left.remainder === right.remainder) {
        return left.index - right.index;
      }

      return right.remainder - left.remainder;
    });

    for (const item of sortedRemainders) {
      if (missingCents <= 0) {
        break;
      }
      const currentValue = baseAllocationsInCents[item.index];
      baseAllocationsInCents[item.index] = currentValue + 1;
      missingCents -= 1;
    }

    return baseAllocationsInCents.map((costInCents) => this.toAmount(costInCents));
  }

  private allocateByEvenSplit(totalOperationalCostCents: number, operationCount: number): number[] {
    const baseAllocation = Math.floor(totalOperationalCostCents / operationCount);
    const missingCents = totalOperationalCostCents % operationCount;
    const costsInCents = Array.from({ length: operationCount }, () => baseAllocation);
    return costsInCents.map((costInCents, index) => {
      if (index < missingCents) {
        return this.toAmount(costInCents + 1);
      }
      return this.toAmount(costInCents);
    });
  }

  private toCents(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100);
  }

  private toAmount(cents: number): number {
    return cents / 100;
  }

  private validate(input: OperationalCostAllocationInput): void {
    if (!Number.isFinite(input.totalOperationalCosts)) {
      throw new Error('Total operational costs must be finite.');
    }

    if (input.totalOperationalCosts < 0) {
      throw new Error('Total operational costs cannot be negative.');
    }

    if (input.operations.length === 0) {
      throw new Error('At least one operation is required for allocation.');
    }

    for (const operation of input.operations) {
      if (!Number.isFinite(operation.quantity) || operation.quantity <= 0) {
        throw new Error('Operation quantity must be greater than zero.');
      }

      if (!Number.isFinite(operation.unitPrice) || operation.unitPrice < 0) {
        throw new Error('Operation unit price cannot be negative.');
      }
    }
  }
}
