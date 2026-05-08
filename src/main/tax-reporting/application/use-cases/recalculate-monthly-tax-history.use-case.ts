import type { DailyBrokerTaxRepository } from '../../../ingestion/application/repositories/daily-broker-tax.repository';
import type { AssetRepository } from '../../../portfolio/application/repositories/asset.repository';
import type { TransactionRepository } from '../../../portfolio/application/repositories/transaction.repository';
import type {
  MonthlyTaxCloseArtifact,
  MonthlyTaxCloseRepository,
  MonthlyTaxCloseSummary,
} from '../repositories/monthly-tax-close.repository';
import { MonthlyTaxAssetClassResolverService } from '../../domain/services/monthly-tax-asset-class-resolver.service';
import { MonthlyTaxCalculatorService } from '../../domain/services/monthly-tax-calculator.service';

export type RecalculateMonthlyTaxHistoryReason =
  | 'bootstrap'
  | 'transactions_changed'
  | 'fees_changed'
  | 'asset_type_changed'
  | 'manual';

export interface RecalculateMonthlyTaxHistoryInput {
  startYear: number;
  reason: RecalculateMonthlyTaxHistoryReason;
}

export interface RecalculateMonthlyTaxHistoryOutput {
  startMonth: string | null;
  endMonth: string | null;
  rebuiltMonths: string[];
  changedMonthCount: number;
  recalculatedAt: string;
}

const MAX_DATE = '9999-12-31';
const MIN_DATE = '1900-01-01';

export class RecalculateMonthlyTaxHistoryUseCase {
  private readonly assetClassResolver = new MonthlyTaxAssetClassResolverService();
  private readonly calculator = new MonthlyTaxCalculatorService();

  constructor(
    private readonly monthlyTaxCloseRepository: MonthlyTaxCloseRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly assetRepository: AssetRepository,
    private readonly dailyBrokerTaxRepository: DailyBrokerTaxRepository,
  ) {}

  async execute(
    input: RecalculateMonthlyTaxHistoryInput,
  ): Promise<RecalculateMonthlyTaxHistoryOutput> {
    const startedAt = Date.now();
    const recalculatedAt = new Date().toISOString();

    console.info('monthly_tax_recalc_started', {
      startYear: input.startYear,
      reason: input.reason,
    });

    try {
      const previousArtifacts = await this.findPreviousArtifacts(input.startYear);
      const transactions = await this.transactionRepository.findByPeriod({
        startDate: MIN_DATE,
        endDate: MAX_DATE,
      });
      const dailyBrokerTaxes = await this.dailyBrokerTaxRepository.findByPeriod({
        startDate: MIN_DATE,
        endDate: MAX_DATE,
      });
      const assets = await this.assetRepository.findByTickersList([
        ...new Set(transactions.map((transaction) => transaction.ticker)),
      ]);
      const assetsByTicker = new Map(assets.map((asset) => [asset.ticker, asset]));
      const result = this.calculator.calculate({
        transactions,
        assetClasses: [...new Set(transactions.map((transaction) => transaction.ticker))].map(
          (ticker) =>
            this.assetClassResolver.resolve({
              ticker,
              assetType: assetsByTicker.get(ticker)?.assetType ?? null,
            }),
        ),
        dailyBrokerTaxes,
        previousArtifacts,
        calculatedAt: recalculatedAt,
      });
      const affectedArtifacts = result.artifacts.filter(
        (artifact) => artifact.month >= `${input.startYear}-01`,
      );

      await this.monthlyTaxCloseRepository.deleteFromYear(input.startYear);
      await Promise.all(
        affectedArtifacts.map((artifact) => this.monthlyTaxCloseRepository.save(artifact)),
      );

      const output = this.createOutput({
        artifacts: affectedArtifacts,
        previousArtifacts,
        recalculatedAt,
      });

      console.info('monthly_tax_recalc_completed', {
        startYear: input.startYear,
        endMonth: output.endMonth,
        reason: input.reason,
        calculationVersion: result.artifacts[0]?.calculationVersion ?? null,
        changedMonthCount: output.changedMonthCount,
        durationMs: Date.now() - startedAt,
      });

      result.artifacts
        .filter((artifact) => artifact.state === 'blocked')
        .forEach((artifact) => {
          console.info('monthly_tax_month_blocked', {
            month: artifact.month,
            state: artifact.state,
            reason: input.reason,
            calculationVersion: artifact.calculationVersion,
          });
        });

      return output;
    } catch (error) {
      console.error('monthly_tax_recalc_failed', {
        startYear: input.startYear,
        reason: input.reason,
        durationMs: Date.now() - startedAt,
        error,
      });
      throw error;
    }
  }

  private async findPreviousArtifacts(startYear: number): Promise<MonthlyTaxCloseArtifact[]> {
    const startMonth = `${startYear}-01`;
    const history = await this.monthlyTaxCloseRepository.findHistory();
    const affectedHistory = history.filter((summary) => summary.month >= startMonth);
    const artifacts = await Promise.all(
      affectedHistory.map((summary) => this.monthlyTaxCloseRepository.findDetail(summary.month)),
    );

    return artifacts.filter((artifact): artifact is MonthlyTaxCloseArtifact => Boolean(artifact));
  }

  private createOutput(input: {
    artifacts: MonthlyTaxCloseArtifact[];
    previousArtifacts: MonthlyTaxCloseArtifact[];
    recalculatedAt: string;
  }): RecalculateMonthlyTaxHistoryOutput {
    const rebuiltMonths = input.artifacts.map((artifact) => artifact.month);
    const previousByMonth = new Map(
      input.previousArtifacts.map((artifact) => [artifact.month, artifact]),
    );

    return {
      startMonth: rebuiltMonths[0] ?? null,
      endMonth: rebuiltMonths.at(-1) ?? null,
      rebuiltMonths,
      changedMonthCount: input.artifacts.filter((artifact) =>
        this.hasChanged(previousByMonth.get(artifact.month) ?? null, artifact),
      ).length,
      recalculatedAt: input.recalculatedAt,
    };
  }

  private hasChanged(
    previous: MonthlyTaxCloseArtifact | null,
    next: MonthlyTaxCloseSummary,
  ): boolean {
    if (!previous) {
      return true;
    }

    return (
      previous.state !== next.state ||
      previous.outcome !== next.outcome ||
      previous.netTaxDue !== next.netTaxDue ||
      previous.carryForwardOut !== next.carryForwardOut ||
      previous.inputFingerprint !== next.inputFingerprint
    );
  }
}
