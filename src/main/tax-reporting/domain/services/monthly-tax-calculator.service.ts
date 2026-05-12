import type { DailyBrokerTax } from '../../../ingestion/domain/entities/daily-broker-tax.entity';
import type { Transaction } from '../../../portfolio/domain/entities/transaction.entity';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';
import { Quantity } from '../../../portfolio/domain/value-objects/quantity.vo';
import { TransactionType } from '../../../shared/types/domain';
import type {
  MonthlyTaxBlockedReason,
  MonthlyTaxCarryForwardDetail,
  MonthlyTaxCloseArtifact,
  MonthlyTaxCloseDetail,
  MonthlyTaxDisclosure,
  MonthlyTaxGroupCode,
  MonthlyTaxGroupDetail,
  MonthlyTaxSaleLine,
} from '../../application/repositories/monthly-tax-close.repository';
import type {
  MonthlyTaxAssetClass,
  MonthlyTaxAssetClassResolution,
} from './monthly-tax-asset-class-resolver.service';
import {
  MonthlyTaxIrrfAllocatorService,
  type MonthlyTaxIrrfAllocation,
  type MonthlyTaxSaleOperationInput,
} from './monthly-tax-irrf-allocator.service';
import { MonthlyTaxWorkspaceStateResolverService } from './monthly-tax-workspace-state-resolver.service';

const CALCULATION_VERSION = 'monthly-tax-v1';
const STOCK_EXEMPTION_CAP = Money.from('20000');
const COMMON_TAX_RATE = '0.15';
const FII_TAX_RATE = '0.20';
const ZERO = '0';

type PositionState = {
  quantity: Quantity;
  averagePrice: Money;
};

type CarryForwardState = {
  commonLoss: Money;
  fiiLoss: Money;
  irrfCredit: Money;
  belowThresholdTax: Money;
};

type GroupAccumulator = {
  grossSales: Money;
  realizedResult: Money;
  carriedLossIn: Money;
  carriedLossOut: Money;
  taxableBase: Money;
  taxDue: Money;
  irrfCreditUsed: Money;
};

type MonthWorkingState = {
  month: string;
  groups: Record<MonthlyTaxGroupCode, GroupAccumulator>;
  blockedReasons: MonthlyTaxBlockedReason[];
  disclosures: MonthlyTaxDisclosure[];
  saleLines: MonthlyTaxSaleLine[];
  openingCarryForward: CarryForwardState;
  taxBeforeCredits: Money;
  irrfCreditUsed: Money;
  netTaxDue: Money;
};

export interface MonthlyTaxCalculatorInput {
  transactions: Transaction[];
  assetClasses: MonthlyTaxAssetClassResolution[];
  dailyBrokerTaxes: DailyBrokerTax[];
  previousArtifacts?: MonthlyTaxCloseArtifact[];
  calculatedAt?: string;
  inputFingerprint?: string;
}

export interface MonthlyTaxCalculatorResult {
  artifacts: MonthlyTaxCloseArtifact[];
}

export class MonthlyTaxCalculatorService {
  private readonly irrfAllocator = new MonthlyTaxIrrfAllocatorService();
  private readonly stateResolver = new MonthlyTaxWorkspaceStateResolverService();

  calculate(input: MonthlyTaxCalculatorInput): MonthlyTaxCalculatorResult {
    const orderedTransactions = this.orderTransactions(input.transactions);
    const assetClassesByTicker = this.mapAssetClasses(input.assetClasses);
    const previousArtifactsByMonth = new Map(
      (input.previousArtifacts ?? []).map((artifact) => [artifact.month, artifact]),
    );
    const months = this.listMonths(orderedTransactions);
    const positions = new Map<string, PositionState>();
    const carryForward = this.createEmptyCarryForward();
    const artifacts: MonthlyTaxCloseArtifact[] = [];

    for (const month of months) {
      const monthTransactions = orderedTransactions.filter((transaction) =>
        transaction.date.startsWith(month),
      );
      const monthState = this.createMonthState(month, carryForward);

      this.addInputBlocks(
        monthState,
        orderedTransactions,
        assetClassesByTicker,
        input.dailyBrokerTaxes,
      );
      this.replayMonth(monthTransactions, {
        positions,
        monthState,
        assetClassesByTicker,
      });
      this.finalizeMonth(monthState, carryForward, orderedTransactions, input.dailyBrokerTaxes);

      const previousArtifact = previousArtifactsByMonth.get(month) ?? null;
      const detail = this.createDetail(monthState, carryForward);
      const initialState = this.stateResolver.resolveFromDetail(detail, { changeSummary: null });
      const changeSummary = this.createChangeSummary({
        previousArtifact,
        nextOutcome: initialState.outcome,
        nextNetTaxDue: monthState.netTaxDue,
        nextCarryForwardOut: carryForward.belowThresholdTax,
      });
      const state = this.stateResolver.resolveFromDetail(detail, { changeSummary });

      detail.summary.state = state.state;
      detail.summary.outcome = state.outcome;

      artifacts.push({
        month,
        state: state.state,
        outcome: state.outcome,
        calculationVersion: CALCULATION_VERSION,
        inputFingerprint:
          input.inputFingerprint ?? this.createInputFingerprint(orderedTransactions),
        calculatedAt: input.calculatedAt ?? new Date().toISOString(),
        netTaxDue: monthState.netTaxDue.toCurrency(),
        carryForwardOut: carryForward.belowThresholdTax.toCurrency(),
        changeSummary,
        detail,
      });
    }

    return { artifacts };
  }

  private replayMonth(
    transactions: Transaction[],
    input: {
      positions: Map<string, PositionState>;
      monthState: MonthWorkingState;
      assetClassesByTicker: Map<string, MonthlyTaxAssetClassResolution>;
    },
  ): void {
    transactions.forEach((transaction) => {
      const assetClass =
        input.assetClassesByTicker.get(transaction.ticker)?.assetClass ?? 'unsupported';

      if (assetClass === 'unsupported') {
        this.addUnsupportedAssetBlock(input.monthState, transaction);
        return;
      }

      this.replaySupportedTransaction(transaction, {
        assetClass,
        positions: input.positions,
        monthState: input.monthState,
      });
    });
  }

  private replaySupportedTransaction(
    transaction: Transaction,
    input: {
      assetClass: Exclude<MonthlyTaxAssetClass, 'unsupported'>;
      positions: Map<string, PositionState>;
      monthState: MonthWorkingState;
    },
  ): void {
    switch (transaction.type) {
      case TransactionType.Buy:
        this.applyBuy(input.positions, transaction);
        return;
      case TransactionType.InitialBalance:
        this.applyInitialBalance(input.positions, transaction);
        return;
      case TransactionType.Sell:
        this.applySell(transaction, input);
        return;
      case TransactionType.TransferIn:
        this.applyTransferIn(input.positions, transaction);
        return;
      case TransactionType.TransferOut:
        this.applyTransferOut(input.positions, transaction, input.monthState);
        return;
      default:
        return;
    }
  }

  private applyBuy(positions: Map<string, PositionState>, transaction: Transaction): void {
    const existing = this.getPosition(positions, transaction.ticker);
    const currentCost = existing.averagePrice.multiplyBy(existing.quantity.getAmount());
    const buyCost = transaction.unitPrice
      .multiplyBy(transaction.quantity.getAmount())
      .add(transaction.fees);
    const nextQuantity = existing.quantity.add(transaction.quantity);

    positions.set(transaction.ticker, {
      quantity: nextQuantity,
      averagePrice: currentCost.add(buyCost).divideBy(nextQuantity.getAmount()),
    });
  }

  private applyInitialBalance(
    positions: Map<string, PositionState>,
    transaction: Transaction,
  ): void {
    positions.set(transaction.ticker, {
      quantity: transaction.quantity,
      averagePrice: transaction.unitPrice,
    });
  }

  private applyTransferIn(positions: Map<string, PositionState>, transaction: Transaction): void {
    const existing = this.getPosition(positions, transaction.ticker);

    positions.set(transaction.ticker, {
      quantity: existing.quantity.add(transaction.quantity),
      averagePrice: existing.averagePrice,
    });
  }

  private applyTransferOut(
    positions: Map<string, PositionState>,
    transaction: Transaction,
    monthState: MonthWorkingState,
  ): void {
    const existing = this.getPosition(positions, transaction.ticker);

    if (!transaction.quantity.isLessThanOrEqualTo(existing.quantity.getAmount())) {
      this.addInsufficientPositionBlock(monthState, transaction);
      return;
    }

    if (existing.quantity.getAmount() === transaction.quantity.getAmount()) {
      positions.set(transaction.ticker, {
        quantity: Quantity.from(0),
        averagePrice: existing.averagePrice,
      });
      return;
    }

    positions.set(transaction.ticker, {
      quantity: existing.quantity.subtract(transaction.quantity),
      averagePrice: existing.averagePrice,
    });
  }

  private applySell(
    transaction: Transaction,
    input: {
      assetClass: Exclude<MonthlyTaxAssetClass, 'unsupported'>;
      positions: Map<string, PositionState>;
      monthState: MonthWorkingState;
      allocationsBySaleId: Map<string, MonthlyTaxIrrfAllocation>;
    },
  ): void {
    const position = this.getPosition(input.positions, transaction.ticker);

    if (!transaction.quantity.isLessThanOrEqualTo(position.quantity.getAmount())) {
      this.addInsufficientPositionBlock(input.monthState, transaction);
      return;
    }

    const soldQuantity = transaction.quantity;
    const grossAmount = transaction.unitPrice.multiplyBy(soldQuantity.getAmount());
    const costBasis = position.averagePrice.multiplyBy(soldQuantity.getAmount());
    const netSaleValue = grossAmount.subtract(transaction.fees);
    const realizedResult = grossAmount.subtract(transaction.fees).subtract(costBasis);
    const groupCode = this.resolvePreliminaryGroup(input.assetClass);

    input.monthState.groups[groupCode].grossSales =
      input.monthState.groups[groupCode].grossSales.add(grossAmount);
    input.monthState.groups[groupCode].realizedResult =
      input.monthState.groups[groupCode].realizedResult.add(realizedResult);
    input.monthState.saleLines.push({
      id: transaction.id.value,
      date: transaction.date,
      ticker: transaction.ticker,
      brokerId: transaction.brokerId.value,
      groupCode,
      assetClass: input.assetClass,
      quantity: soldQuantity.getAmount(),
      grossAmount: grossAmount.toCurrency(),
      costBasis: costBasis.toCurrency(),
      fees: transaction.fees.toCurrency(),
      netSaleValue: netSaleValue.toCurrency(),
      realizedResult: realizedResult.toCurrency(),
      allocatedIrrf: '0.00',
    });

    input.positions.set(transaction.ticker, {
      quantity: position.quantity.subtract(soldQuantity),
      averagePrice: position.averagePrice,
    });
  }

  private finalizeMonth(
    monthState: MonthWorkingState,
    carryForward: CarryForwardState,
    orderedTransactions: Transaction[],
    dailyBrokerTaxes: DailyBrokerTax[],
  ): void {
    this.reclassifyExemptStockSales(monthState);
    this.applyDisclosure(monthState);
    this.applyLossCarryForward(monthState.groups['geral-comum'], carryForward.commonLoss);
    this.applyLossCarryForward(monthState.groups.fii, carryForward.fiiLoss);

    carryForward.commonLoss = monthState.groups['geral-comum'].carriedLossOut;
    carryForward.fiiLoss = monthState.groups.fii.carriedLossOut;
    monthState.groups['geral-comum'].taxDue =
      monthState.groups['geral-comum'].taxableBase.multiplyBy(COMMON_TAX_RATE);
    monthState.groups.fii.taxDue = monthState.groups.fii.taxableBase.multiplyBy(FII_TAX_RATE);
    monthState.taxBeforeCredits = monthState.groups['geral-comum'].taxDue.add(
      monthState.groups.fii.taxDue,
    );

    const monthIrrf = this.sumMonthlyIrrf(orderedTransactions, dailyBrokerTaxes, monthState.month);
    const availableCredit = monthIrrf.add(carryForward.irrfCredit);
    const openingBelowThresholdTax = carryForward.belowThresholdTax;
    const payableBeforeThreshold = monthState.taxBeforeCredits
      .add(openingBelowThresholdTax)
      .subtract(availableCredit);

    if (payableBeforeThreshold.isNegative()) {
      carryForward.irrfCredit = Money.from(0).subtract(payableBeforeThreshold);
      carryForward.belowThresholdTax = Money.from(0);
      monthState.irrfCreditUsed = monthState.taxBeforeCredits.add(openingBelowThresholdTax);
      monthState.netTaxDue = Money.from(0);
      return;
    }

    carryForward.irrfCredit = Money.from(0);
    monthState.irrfCreditUsed = availableCredit;
    monthState.netTaxDue = payableBeforeThreshold;
    carryForward.belowThresholdTax = this.isBelowThreshold(payableBeforeThreshold)
      ? payableBeforeThreshold
      : Money.from(0);
  }

  private sumMonthlyIrrf(
    transactions: Transaction[],
    dailyTaxes: DailyBrokerTax[],
    month: string,
  ): Money {
    const monthTransactions = transactions.filter((tx) => tx.date.startsWith(month));
    const datesWithSales = new Set(
      monthTransactions
        .filter((tx) => tx.type === TransactionType.Sell)
        .map((tx) => tx.date),
    );

    return dailyTaxes
      .filter((tax) => tax.date.startsWith(month) && datesWithSales.has(tax.date))
      .reduce((total, tax) => total.add(tax.irrf), Money.from(0));
  }

  private reclassifyExemptStockSales(monthState: MonthWorkingState): void {
    const commonGroup = monthState.groups['geral-comum'];

    if (commonGroup.grossSales.isGreaterThan(STOCK_EXEMPTION_CAP)) {
      return;
    }

    const exemptStockLines = monthState.saleLines.filter(
      (line) => line.assetClass === 'stock' && line.groupCode === 'geral-comum',
    );

    exemptStockLines.forEach((line) => {
      line.groupCode = 'geral-isento';
    });

    const exemptGross = exemptStockLines.reduce(
      (total, line) => total.add(Money.from(line.grossAmount)),
      Money.from(0),
    );
    const exemptResult = exemptStockLines.reduce(
      (total, line) => total.add(Money.from(line.realizedResult)),
      Money.from(0),
    );

    commonGroup.grossSales = commonGroup.grossSales.subtract(exemptGross);
    commonGroup.realizedResult = commonGroup.realizedResult.subtract(exemptResult);
    monthState.groups['geral-isento'].grossSales =
      monthState.groups['geral-isento'].grossSales.add(exemptGross);
    monthState.groups['geral-isento'].realizedResult =
      monthState.groups['geral-isento'].realizedResult.add(exemptResult);
  }

  private applyLossCarryForward(group: GroupAccumulator, openingLoss: Money): void {
    group.carriedLossIn = openingLoss;

    if (group.realizedResult.isNegative()) {
      group.carriedLossOut = openingLoss.add(Money.from(0).subtract(group.realizedResult));
      return;
    }

    if (group.realizedResult.isGreaterThan(openingLoss)) {
      group.taxableBase = group.realizedResult.subtract(openingLoss);
      group.carriedLossOut = Money.from(0);
      return;
    }

    group.carriedLossOut = openingLoss.subtract(group.realizedResult);
  }

  private createDetail(
    monthState: MonthWorkingState,
    carryForward: CarryForwardState,
  ): MonthlyTaxCloseDetail {
    const groups = this.createGroupDetails(monthState.groups);

    return {
      summary: {
        month: monthState.month,
        state: 'closed',
        outcome: 'no_tax',
        grossSales: groups
          .reduce((total, group) => total.add(Money.from(group.grossSales)), Money.from(0))
          .toCurrency(),
        realizedResult: groups
          .reduce((total, group) => total.add(Money.from(group.realizedResult)), Money.from(0))
          .toCurrency(),
        taxBeforeCredits: monthState.taxBeforeCredits.toCurrency(),
        irrfCreditUsed: monthState.irrfCreditUsed.toCurrency(),
        netTaxDue: monthState.netTaxDue.toCurrency(),
      },
      groups,
      blockedReasons: monthState.blockedReasons,
      disclosures: monthState.disclosures,
      carryForward: this.createCarryForwardDetail(carryForward, monthState),
      saleLines: monthState.saleLines,
    };
  }

  private createGroupDetails(
    groups: Record<MonthlyTaxGroupCode, GroupAccumulator>,
  ): MonthlyTaxGroupDetail[] {
    return [
      this.createGroupDetail(
        'geral-comum',
        'Geral - Comum',
        groups['geral-comum'],
        COMMON_TAX_RATE,
      ),
      this.createGroupDetail('geral-isento', 'Geral - Isento', groups['geral-isento'], ZERO),
      this.createGroupDetail('fii', 'FII', groups.fii, FII_TAX_RATE),
    ];
  }

  private createGroupDetail(
    code: MonthlyTaxGroupCode,
    label: MonthlyTaxGroupDetail['label'],
    group: GroupAccumulator,
    taxRate: string,
  ): MonthlyTaxGroupDetail {
    return {
      code,
      label,
      grossSales: group.grossSales.toCurrency(),
      realizedResult: group.realizedResult.toCurrency(),
      carriedLossIn: group.carriedLossIn.toCurrency(),
      carriedLossOut: group.carriedLossOut.toCurrency(),
      taxableBase: group.taxableBase.toCurrency(),
      taxRate,
      taxDue: group.taxDue.toCurrency(),
      irrfCreditUsed: '0.00',
    };
  }

  private createCarryForwardDetail(
    carryForward: CarryForwardState,
    monthState: MonthWorkingState,
  ): MonthlyTaxCarryForwardDetail {
    return {
      openingCommonLoss: monthState.openingCarryForward.commonLoss.toCurrency(),
      closingCommonLoss: carryForward.commonLoss.toCurrency(),
      openingFiiLoss: monthState.openingCarryForward.fiiLoss.toCurrency(),
      closingFiiLoss: carryForward.fiiLoss.toCurrency(),
      openingIrrfCredit: monthState.openingCarryForward.irrfCredit.toCurrency(),
      closingIrrfCredit: carryForward.irrfCredit.toCurrency(),
      openingBelowThresholdTax: monthState.openingCarryForward.belowThresholdTax.toCurrency(),
      closingBelowThresholdTax: carryForward.belowThresholdTax.toCurrency(),
    };
  }

  private addInputBlocks(
    monthState: MonthWorkingState,
    transactions: Transaction[],
    assetClassesByTicker: Map<string, MonthlyTaxAssetClassResolution>,
    dailyBrokerTaxes: DailyBrokerTax[],
  ): void {
    this.addDayTradeBlocks(monthState, transactions);

    const allocationResult = this.irrfAllocator.allocate({
      sales: this.createSaleInputs(
        transactions.filter((transaction) => transaction.date.startsWith(monthState.month)),
        assetClassesByTicker,
      ),
      dailyBrokerTaxes,
    });

    allocationResult.missingInputs.forEach((missingInput) => {
      monthState.blockedReasons.push({
        code: missingInput.reason,
        message: 'Missing daily broker tax data required to allocate IRRF.',
        repairTarget: {
          tab: 'brokers',
          hintCode:
            missingInput.reason === 'missing_daily_broker_tax' ? 'daily_broker_tax' : 'irrf',
        },
        metadata: {
          date: missingInput.date,
          brokerId: missingInput.brokerId,
          saleOperationIds: missingInput.saleOperationIds,
        },
      });
    });
  }

  private addDayTradeBlocks(monthState: MonthWorkingState, transactions: Transaction[]): void {
    const monthTransactions = transactions.filter((transaction) =>
      transaction.date.startsWith(monthState.month),
    );
    const grouped = monthTransactions.reduce<Map<string, Set<TransactionType>>>(
      (groups, transaction) => {
        const key = `${transaction.date}:${transaction.ticker}`;
        const existing = groups.get(key) ?? new Set<TransactionType>();
        existing.add(transaction.type);
        groups.set(key, existing);
        return groups;
      },
      new Map(),
    );

    [...grouped.entries()]
      .filter(([, types]) => types.has(TransactionType.Buy) && types.has(TransactionType.Sell))
      .forEach(([key]) => {
        const [date, ticker] = key.split(':');
        monthState.blockedReasons.push({
          code: 'day_trade_not_supported',
          message:
            'Same-day opposing trades for this ticker are outside the V1 monthly close scope.',
          metadata: {
            date,
            ticker,
          },
        });
      });
  }

  private createSaleInputs(
    transactions: Transaction[],
    assetClassesByTicker: Map<string, MonthlyTaxAssetClassResolution>,
  ): MonthlyTaxSaleOperationInput[] {
    return transactions
      .filter((transaction) => transaction.type === TransactionType.Sell)
      .map((transaction) => ({
        id: transaction.id.value,
        date: transaction.date,
        brokerId: transaction.brokerId.value,
        ticker: transaction.ticker,
        assetClass: assetClassesByTicker.get(transaction.ticker)?.assetClass ?? 'unsupported',
        grossAmount: transaction.unitPrice.multiplyBy(transaction.quantity.getAmount()),
      }));
  }

  private addUnsupportedAssetBlock(monthState: MonthWorkingState, transaction: Transaction): void {
    monthState.blockedReasons.push({
      code: 'unsupported_asset_class',
      message: 'Asset classification is missing or outside the V1 monthly close scope.',
      repairTarget: {
        tab: 'assets',
        hintCode: 'asset_type',
      },
      metadata: {
        ticker: transaction.ticker,
      },
    });
  }

  private addInsufficientPositionBlock(
    monthState: MonthWorkingState,
    transaction: Transaction,
  ): void {
    monthState.blockedReasons.push({
      code: 'insufficient_position',
      message: 'A sale or transfer cannot be replayed from the available position history.',
      repairTarget: {
        tab: 'import',
        hintCode: 'broker_metadata',
      },
      metadata: {
        ticker: transaction.ticker,
        date: transaction.date,
      },
    });
  }

  private applyDisclosure(monthState: MonthWorkingState): void {
    if (monthState.saleLines.some((line) => line.assetClass === 'unit')) {
      monthState.disclosures.push({
        code: 'unit_non_exempt_policy',
        severity: 'review',
        message: 'Units are treated as non-exempt in the V1 monthly close policy.',
      });
    }

    if (monthState.saleLines.some((line) => line.assetClass === 'etf')) {
      monthState.disclosures.push({
        code: 'etf_non_exempt_policy',
        severity: 'review',
        message: 'ETFs are treated as non-exempt in the V1 monthly close policy.',
      });
    }
  }

  private resolvePreliminaryGroup(
    assetClass: Exclude<MonthlyTaxAssetClass, 'unsupported'>,
  ): MonthlyTaxGroupCode {
    if (assetClass === 'fii') {
      return 'fii';
    }

    return 'geral-comum';
  }

  private createMonthState(month: string, carryForward: CarryForwardState): MonthWorkingState {
    return {
      month,
      groups: {
        'geral-comum': this.createGroupAccumulator(),
        'geral-isento': this.createGroupAccumulator(),
        fii: this.createGroupAccumulator(),
      },
      blockedReasons: [],
      disclosures: [],
      saleLines: [],
      openingCarryForward: {
        commonLoss: carryForward.commonLoss,
        fiiLoss: carryForward.fiiLoss,
        irrfCredit: carryForward.irrfCredit,
        belowThresholdTax: carryForward.belowThresholdTax,
      },
      taxBeforeCredits: Money.from(0),
      irrfCreditUsed: Money.from(0),
      netTaxDue: Money.from(0),
    };
  }

  private createGroupAccumulator(): GroupAccumulator {
    return {
      grossSales: Money.from(0),
      realizedResult: Money.from(0),
      carriedLossIn: Money.from(0),
      carriedLossOut: Money.from(0),
      taxableBase: Money.from(0),
      taxDue: Money.from(0),
      irrfCreditUsed: Money.from(0),
    };
  }

  private createEmptyCarryForward(): CarryForwardState {
    return {
      commonLoss: Money.from(0),
      fiiLoss: Money.from(0),
      irrfCredit: Money.from(0),
      belowThresholdTax: Money.from(0),
    };
  }

  private getPosition(positions: Map<string, PositionState>, ticker: string): PositionState {
    return (
      positions.get(ticker) ?? {
        quantity: Quantity.from(0),
        averagePrice: Money.from(0),
      }
    );
  }

  private isBelowThreshold(amount: Money): boolean {
    return amount.isGreaterThan(0) && amount.isLessThanOrEqualTo('9.99');
  }

  private createChangeSummary(input: {
    previousArtifact: MonthlyTaxCloseArtifact | null;
    nextOutcome: MonthlyTaxCloseArtifact['outcome'];
    nextNetTaxDue: Money;
    nextCarryForwardOut: Money;
  }): string | null {
    const previousArtifact = input.previousArtifact;

    if (!previousArtifact) {
      return null;
    }

    if (previousArtifact.outcome !== input.nextOutcome) {
      return `Outcome changed from ${previousArtifact.outcome} to ${input.nextOutcome}.`;
    }

    const previousNetTaxDue = previousArtifact.netTaxDue;
    const nextNetTaxDue = input.nextNetTaxDue.toCurrency();

    if (previousNetTaxDue !== nextNetTaxDue) {
      return `Net tax due changed from ${previousNetTaxDue} to ${nextNetTaxDue}.`;
    }

    const nextCarryForwardOut = input.nextCarryForwardOut.toCurrency();
    if (previousArtifact.carryForwardOut !== nextCarryForwardOut) {
      return `Carry-forward changed from ${previousArtifact.carryForwardOut} to ${nextCarryForwardOut}.`;
    }

    return null;
  }

  private createInputFingerprint(transactions: Transaction[]): string {
    return transactions
      .map((transaction) => `${transaction.id.value}:${transaction.date}:${transaction.type}`)
      .join('|');
  }

  private listMonths(transactions: Transaction[]): string[] {
    return [...new Set(transactions.map((transaction) => transaction.date.slice(0, 7)))].sort();
  }

  private orderTransactions(transactions: Transaction[]): Transaction[] {
    return [...transactions].sort((left, right) => {
      const dateOrder = left.date.localeCompare(right.date);
      if (dateOrder !== 0) {
        return dateOrder;
      }

      if (left.isInitialBalance() === right.isInitialBalance()) {
        return left.id.value.localeCompare(right.id.value);
      }

      return left.isInitialBalance() ? -1 : 1;
    });
  }

  private mapAssetClasses(
    assetClasses: MonthlyTaxAssetClassResolution[],
  ): Map<string, MonthlyTaxAssetClassResolution> {
    return new Map(assetClasses.map((item) => [item.ticker, item]));
  }
}
