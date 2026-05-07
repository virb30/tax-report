import type { DailyBrokerTax } from '../../../ingestion/domain/entities/daily-broker-tax.entity';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';
import type { MonthlyTaxAssetClass } from './monthly-tax-asset-class-resolver.service';

export interface MonthlyTaxSaleOperationInput {
  id: string;
  date: string;
  brokerId: string;
  ticker: string;
  assetClass: MonthlyTaxAssetClass;
  grossAmount: Money;
}

export type MonthlyTaxIrrfMissingReason =
  | 'missing_daily_broker_tax'
  | 'non_positive_supported_sale_total';

export interface MonthlyTaxIrrfAllocation {
  saleOperationId: string;
  date: string;
  brokerId: string;
  ticker: string;
  assetClass: Exclude<MonthlyTaxAssetClass, 'unsupported'>;
  grossAmount: Money;
  allocatedIrrf: Money;
}

export interface MonthlyTaxIrrfMissingInput {
  date: string;
  brokerId: string;
  saleOperationIds: string[];
  reason: MonthlyTaxIrrfMissingReason;
}

export interface MonthlyTaxIrrfAllocationResult {
  allocations: MonthlyTaxIrrfAllocation[];
  missingInputs: MonthlyTaxIrrfMissingInput[];
}

type SupportedSaleOperation = MonthlyTaxSaleOperationInput & {
  assetClass: Exclude<MonthlyTaxAssetClass, 'unsupported'>;
};

type SaleGroup = {
  date: string;
  brokerId: string;
  operations: SupportedSaleOperation[];
};

export class MonthlyTaxIrrfAllocatorService {
  allocate(input: {
    sales: MonthlyTaxSaleOperationInput[];
    dailyBrokerTaxes: DailyBrokerTax[];
  }): MonthlyTaxIrrfAllocationResult {
    const supportedSales = input.sales.filter((sale): sale is SupportedSaleOperation =>
      this.isSupportedSale(sale),
    );
    const dailyTaxesByKey = new Map(
      input.dailyBrokerTaxes.map((tax) => [this.buildKey(tax.date, tax.brokerId.value), tax]),
    );

    return this.groupSales(supportedSales).reduce<MonthlyTaxIrrfAllocationResult>(
      (result, group) => this.allocateGroup(result, group, dailyTaxesByKey),
      {
        allocations: [],
        missingInputs: [],
      },
    );
  }

  private allocateGroup(
    result: MonthlyTaxIrrfAllocationResult,
    group: SaleGroup,
    dailyTaxesByKey: Map<string, DailyBrokerTax>,
  ): MonthlyTaxIrrfAllocationResult {
    const dailyTax = dailyTaxesByKey.get(this.buildKey(group.date, group.brokerId));

    if (!dailyTax) {
      result.missingInputs.push(this.buildMissingInput(group, 'missing_daily_broker_tax'));
      return result;
    }

    const totalGrossAmount = group.operations.reduce(
      (total, operation) => total.add(operation.grossAmount),
      Money.from(0),
    );

    if (totalGrossAmount.isLessThanOrEqualTo(0)) {
      result.missingInputs.push(this.buildMissingInput(group, 'non_positive_supported_sale_total'));
      return result;
    }

    result.allocations.push(
      ...group.operations.map((operation) => ({
        saleOperationId: operation.id,
        date: operation.date,
        brokerId: operation.brokerId,
        ticker: operation.ticker,
        assetClass: operation.assetClass,
        grossAmount: operation.grossAmount,
        allocatedIrrf: dailyTax.irrf.multiplyBy(
          operation.grossAmount.divideBy(totalGrossAmount.getAmount()).getAmount(),
        ),
      })),
    );

    return result;
  }

  private groupSales(sales: SupportedSaleOperation[]): SaleGroup[] {
    const groupsByKey = sales.reduce<Map<string, SaleGroup>>((groups, sale) => {
      const key = this.buildKey(sale.date, sale.brokerId);
      const existingGroup = groups.get(key);

      if (existingGroup) {
        existingGroup.operations.push(sale);
        return groups;
      }

      groups.set(key, {
        date: sale.date,
        brokerId: sale.brokerId,
        operations: [sale],
      });

      return groups;
    }, new Map());

    return [...groupsByKey.values()];
  }

  private buildMissingInput(
    group: SaleGroup,
    reason: MonthlyTaxIrrfMissingReason,
  ): MonthlyTaxIrrfMissingInput {
    return {
      date: group.date,
      brokerId: group.brokerId,
      saleOperationIds: group.operations.map((operation) => operation.id),
      reason,
    };
  }

  private isSupportedSale(sale: MonthlyTaxSaleOperationInput): sale is SupportedSaleOperation {
    return sale.assetClass !== 'unsupported';
  }

  private buildKey(date: string, brokerId: string): string {
    return `${date}:${brokerId}`;
  }
}
