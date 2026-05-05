import {
  CapitalGainsAssessmentStatus,
  CapitalGainsAssetCategory,
  CapitalGainsBlockerCode,
  CapitalGainsTraceClassification,
} from '../../../shared/types/domain';
import { Money } from '../../portfolio/domain/value-objects/money.vo';
import type {
  AssessmentBlockerOutput,
  CapitalGainsAnnualTotals,
  CapitalGainsCategoryTotals,
  CapitalGainsMonth,
  SaleTraceOutput,
} from '../application/use-cases/generate-capital-gains-assessment/generate-capital-gains-assessment.output';

const ORDINARY_STOCK_EXEMPTION_THRESHOLD = 20_000;
const SUPPORTED_CATEGORIES = [
  CapitalGainsAssetCategory.Stock,
  CapitalGainsAssetCategory.Fii,
  CapitalGainsAssetCategory.Etf,
] as const;

export interface CapitalGainsMonthlyAssessmentInput {
  baseYear: number;
  saleTraces: SaleTraceOutput[];
  blockers: AssessmentBlockerOutput[];
}

export interface CapitalGainsMonthlyAssessment {
  annualTotals: CapitalGainsAnnualTotals;
  months: CapitalGainsMonth[];
  summaryBlockers: AssessmentBlockerOutput[];
}

type CategoryLossBalances = Record<CapitalGainsAssetCategory, Money>;

type MonthlyGroup = {
  month: string;
  saleTraces: SaleTraceOutput[];
  blockers: AssessmentBlockerOutput[];
};

type CategoryAssessment = {
  totals: CapitalGainsCategoryTotals;
  traces: SaleTraceOutput[];
};

type CategoryNetResult = {
  taxableAmount: Money;
  exemptAmount: Money;
  lossGenerated: Money;
  compensatedLossAmount: Money;
  remainingLossBalance: Money;
};

export class CapitalGainsLossCompensationService {
  assess(input: CapitalGainsMonthlyAssessmentInput): CapitalGainsMonthlyAssessment {
    const lossBalances = this.createZeroLossBalances();
    const months = this.groupMonths(input).map((monthGroup) =>
      this.assessMonth({ monthGroup, lossBalances }),
    );

    return {
      annualTotals: this.calculateAnnualTotals(months),
      months,
      summaryBlockers: input.blockers,
    };
  }

  private assessMonth(input: {
    monthGroup: MonthlyGroup;
    lossBalances: CategoryLossBalances;
  }): CapitalGainsMonth {
    const categoryAssessments = SUPPORTED_CATEGORIES.map((category) =>
      this.assessCategory({
        category,
        traces: input.monthGroup.saleTraces.filter((trace) => trace.category === category),
        monthTraces: input.monthGroup.saleTraces,
        lossBalances: input.lossBalances,
      }),
    );
    const categories = categoryAssessments.map((assessment) => assessment.totals);
    const saleTraces = categoryAssessments.flatMap((assessment) => assessment.traces);

    return {
      month: input.monthGroup.month,
      status: this.selectStatus(input.monthGroup),
      categories,
      blockers: input.monthGroup.blockers,
      saleTraces,
    };
  }

  private assessCategory(input: {
    category: CapitalGainsAssetCategory;
    traces: SaleTraceOutput[];
    monthTraces: SaleTraceOutput[];
    lossBalances: CategoryLossBalances;
  }): CategoryAssessment {
    const isStockExemptMonth =
      input.category === CapitalGainsAssetCategory.Stock &&
      this.calculateCategorySaleProceeds(
        input.monthTraces,
        CapitalGainsAssetCategory.Stock,
      ).isLessThanOrEqualTo(ORDINARY_STOCK_EXEMPTION_THRESHOLD);

    const netResult = this.assessCategoryNetResult({
      category: input.category,
      traces: input.traces,
      isStockExemptMonth,
      lossBalances: input.lossBalances,
    });
    const assessedTraces = this.assessCategoryTraces({
      traces: input.traces,
      netResult,
    });

    return {
      totals: this.calculateCategoryTotals({
        category: input.category,
        traces: assessedTraces,
        netResult,
      }),
      traces: assessedTraces,
    };
  }

  private assessCategoryNetResult(input: {
    category: CapitalGainsAssetCategory;
    traces: SaleTraceOutput[];
    isStockExemptMonth: boolean;
    lossBalances: CategoryLossBalances;
  }): CategoryNetResult {
    const grossResult = this.sumMoney(input.traces, (trace) => trace.grossResult);
    const categoryBalance = input.lossBalances[input.category];

    if (grossResult.isNegative()) {
      const lossGenerated = grossResult.multiplyBy(-1);
      const remainingLossBalance = categoryBalance.add(lossGenerated);
      input.lossBalances[input.category] = remainingLossBalance;

      return this.toCategoryNetResult({
        lossGenerated,
        remainingLossBalance,
      });
    }

    if (!grossResult.isGreaterThan(0)) {
      return this.toCategoryNetResult({
        remainingLossBalance: categoryBalance,
      });
    }

    if (input.isStockExemptMonth) {
      return this.toCategoryNetResult({
        exemptAmount: grossResult,
        remainingLossBalance: categoryBalance,
      });
    }

    const compensatedLoss = this.minMoney(grossResult, categoryBalance);
    const taxableAmount = grossResult.subtract(compensatedLoss);
    const remainingLossBalance = categoryBalance.subtract(compensatedLoss);
    input.lossBalances[input.category] = remainingLossBalance;

    return this.toCategoryNetResult({
      taxableAmount,
      compensatedLossAmount: compensatedLoss,
      remainingLossBalance,
    });
  }

  private assessCategoryTraces(input: {
    traces: SaleTraceOutput[];
    netResult: CategoryNetResult;
  }): SaleTraceOutput[] {
    let remainingExemptAmount = input.netResult.exemptAmount;
    let remainingTaxableAmount = input.netResult.taxableAmount;
    let remainingCompensatedLoss = input.netResult.compensatedLossAmount;

    return input.traces.map((trace) => {
      const grossResult = Money.from(trace.grossResult);
      if (grossResult.isNegative()) {
        return {
          ...trace,
          exemptAmount: 0,
          taxableAmount: 0,
          lossGenerated: grossResult.multiplyBy(-1).toNumber(),
          compensatedLossAmount: 0,
          remainingCategoryLossBalance: input.netResult.remainingLossBalance.toNumber(),
          classification: CapitalGainsTraceClassification.Loss,
        };
      }

      if (!grossResult.isGreaterThan(0)) {
        return {
          ...trace,
          exemptAmount: 0,
          taxableAmount: 0,
          lossGenerated: 0,
          compensatedLossAmount: 0,
          remainingCategoryLossBalance: input.netResult.remainingLossBalance.toNumber(),
          classification: CapitalGainsTraceClassification.TaxableGain,
        };
      }

      const exemptAmount = this.minMoney(grossResult, remainingExemptAmount);
      remainingExemptAmount = remainingExemptAmount.subtract(exemptAmount);
      const resultAfterExemption = grossResult.subtract(exemptAmount);
      const compensatedLoss = this.minMoney(resultAfterExemption, remainingCompensatedLoss);
      remainingCompensatedLoss = remainingCompensatedLoss.subtract(compensatedLoss);
      const resultAfterCompensation = resultAfterExemption.subtract(compensatedLoss);
      const taxableAmount = this.minMoney(resultAfterCompensation, remainingTaxableAmount);
      remainingTaxableAmount = remainingTaxableAmount.subtract(taxableAmount);

      return {
        ...trace,
        exemptAmount: exemptAmount.toNumber(),
        taxableAmount: taxableAmount.toNumber(),
        lossGenerated: 0,
        compensatedLossAmount: compensatedLoss.toNumber(),
        remainingCategoryLossBalance: input.netResult.remainingLossBalance.toNumber(),
        classification: this.classifyPositiveTrace({
          exemptAmount,
          compensatedLoss,
        }),
      };
    });
  }

  private classifyPositiveTrace(input: {
    exemptAmount: Money;
    compensatedLoss: Money;
  }): CapitalGainsTraceClassification {
    if (input.exemptAmount.isGreaterThan(0)) {
      return CapitalGainsTraceClassification.ExemptStockGain;
    }

    if (input.compensatedLoss.isGreaterThan(0)) {
      return CapitalGainsTraceClassification.CompensatedGain;
    }

    return CapitalGainsTraceClassification.TaxableGain;
  }

  private toCategoryNetResult(input: {
    taxableAmount?: Money;
    exemptAmount?: Money;
    lossGenerated?: Money;
    compensatedLossAmount?: Money;
    remainingLossBalance: Money;
  }): CategoryNetResult {
    return {
      taxableAmount: input.taxableAmount ?? Money.from(0),
      exemptAmount: input.exemptAmount ?? Money.from(0),
      lossGenerated: input.lossGenerated ?? Money.from(0),
      compensatedLossAmount: input.compensatedLossAmount ?? Money.from(0),
      remainingLossBalance: input.remainingLossBalance,
    };
  }

  private groupMonths(input: CapitalGainsMonthlyAssessmentInput): MonthlyGroup[] {
    const groups = new Map<string, MonthlyGroup>();

    for (const trace of input.saleTraces) {
      const month = trace.date.slice(0, 7);
      this.getMonthGroup(groups, month).saleTraces.push(trace);
    }

    for (const blocker of input.blockers) {
      if (!blocker.month) {
        continue;
      }

      this.getMonthGroup(groups, blocker.month).blockers.push(blocker);
    }

    return [...groups.values()].sort((left, right) => left.month.localeCompare(right.month));
  }

  private getMonthGroup(groups: Map<string, MonthlyGroup>, month: string): MonthlyGroup {
    const group = groups.get(month);
    if (group) {
      return group;
    }

    const nextGroup = {
      month,
      saleTraces: [],
      blockers: [],
    };
    groups.set(month, nextGroup);
    return nextGroup;
  }

  private selectStatus(monthGroup: MonthlyGroup): CapitalGainsAssessmentStatus {
    if (monthGroup.saleTraces.length > 0 && monthGroup.blockers.length > 0) {
      return CapitalGainsAssessmentStatus.Mixed;
    }

    if (monthGroup.blockers.length === 0) {
      return CapitalGainsAssessmentStatus.Ready;
    }

    if (monthGroup.blockers.some((blocker) => this.isPendingBlocker(blocker.code))) {
      return CapitalGainsAssessmentStatus.Pending;
    }

    return CapitalGainsAssessmentStatus.Unsupported;
  }

  private isPendingBlocker(code: CapitalGainsBlockerCode): boolean {
    return (
      code === CapitalGainsBlockerCode.MissingAssetCategory ||
      code === CapitalGainsBlockerCode.MissingCostBasis ||
      code === CapitalGainsBlockerCode.AmbiguousCostBasis ||
      code === CapitalGainsBlockerCode.MissingTransactionData
    );
  }

  private calculateCategorySaleProceeds(
    traces: SaleTraceOutput[],
    category: CapitalGainsAssetCategory,
  ): Money {
    return traces
      .filter((trace) => trace.category === category)
      .reduce((total, trace) => total.add(Money.from(trace.saleProceeds)), Money.from(0));
  }

  private calculateCategoryTotals(input: {
    category: CapitalGainsAssetCategory;
    traces: SaleTraceOutput[];
    netResult: CategoryNetResult;
  }): CapitalGainsCategoryTotals {
    return {
      category: input.category,
      saleProceeds: this.sumMoney(input.traces, (trace) => trace.saleProceeds).toNumber(),
      taxableGain: input.netResult.taxableAmount.toNumber(),
      exemptGain: input.netResult.exemptAmount.toNumber(),
      loss: input.netResult.lossGenerated.toNumber(),
      compensatedLoss: input.netResult.compensatedLossAmount.toNumber(),
      remainingLossBalance: input.netResult.remainingLossBalance.toNumber(),
    };
  }

  private calculateAnnualTotals(months: CapitalGainsMonth[]): CapitalGainsAnnualTotals {
    const categories = SUPPORTED_CATEGORIES.map((category) => ({
      category,
      saleProceeds: this.sumMonthCategoryTotals(months, category, 'saleProceeds'),
      taxableGain: this.sumMonthCategoryTotals(months, category, 'taxableGain'),
      exemptGain: this.sumMonthCategoryTotals(months, category, 'exemptGain'),
      loss: this.sumMonthCategoryTotals(months, category, 'loss'),
      compensatedLoss: this.sumMonthCategoryTotals(months, category, 'compensatedLoss'),
      remainingLossBalance: this.getFinalRemainingLossBalance(months, category),
    }));

    return {
      saleProceeds: this.sumCategoryTotals(categories, 'saleProceeds'),
      taxableGain: this.sumCategoryTotals(categories, 'taxableGain'),
      exemptStockGain: this.sumCategoryTotals(categories, 'exemptGain'),
      loss: this.sumCategoryTotals(categories, 'loss'),
      compensatedLoss: this.sumCategoryTotals(categories, 'compensatedLoss'),
      remainingLossBalance: this.sumCategoryTotals(categories, 'remainingLossBalance'),
      categories,
    };
  }

  private sumMonthCategoryTotals(
    months: CapitalGainsMonth[],
    category: CapitalGainsAssetCategory,
    field: keyof Omit<CapitalGainsCategoryTotals, 'category'>,
  ): number {
    const total = months.reduce((sum, month) => {
      const categoryTotals = month.categories.find((item) => item.category === category);
      return sum.add(Money.from(categoryTotals?.[field] ?? 0));
    }, Money.from(0));

    return total.toNumber();
  }

  private getFinalRemainingLossBalance(
    months: CapitalGainsMonth[],
    category: CapitalGainsAssetCategory,
  ): number {
    const totals = [...months]
      .reverse()
      .map((month) => month.categories.find((item) => item.category === category))
      .find((categoryTotals) => categoryTotals !== undefined);

    return totals?.remainingLossBalance ?? 0;
  }

  private sumCategoryTotals(
    categories: CapitalGainsCategoryTotals[],
    field: keyof Omit<CapitalGainsCategoryTotals, 'category'>,
  ): number {
    return categories
      .reduce((sum, category) => sum.add(Money.from(category[field])), Money.from(0))
      .toNumber();
  }

  private sumMoney<T>(items: T[], getValue: (item: T) => number): Money {
    return items.reduce((total, item) => total.add(Money.from(getValue(item))), Money.from(0));
  }

  private minMoney(left: Money, right: Money): Money {
    if (left.isLessThanOrEqualTo(right)) {
      return left;
    }

    return right;
  }

  private createZeroLossBalances(): CategoryLossBalances {
    return {
      [CapitalGainsAssetCategory.Stock]: Money.from(0),
      [CapitalGainsAssetCategory.Fii]: Money.from(0),
      [CapitalGainsAssetCategory.Etf]: Money.from(0),
    };
  }
}
