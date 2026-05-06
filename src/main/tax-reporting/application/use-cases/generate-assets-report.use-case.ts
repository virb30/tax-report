import type { AssetType, PendingIssueCode, ReportItemStatus } from '../../../shared/types/domain';
import type { BrokerRepository } from '../../../portfolio/application/repositories/broker.repository';
import type { AssetPositionRepository } from '../../../portfolio/application/repositories/asset-position.repository';
import type { AssetRepository } from '../../../portfolio/application/repositories/asset.repository';
import type { TransactionRepository } from '../../../portfolio/application/repositories/transaction.repository';
import { AssetPosition } from '../../../portfolio/domain/entities/asset-position.entity';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';
import { Quantity } from '../../../portfolio/domain/value-objects/quantity.vo';
import { ReportGenerator } from '../../domain/report-generator.service';

export interface GenerateAssetReportInput {
  baseYear: number;
}

export interface RevenueClassification {
  group: string;
  code: string;
}

export interface PendingIssueOutput {
  code: PendingIssueCode;
  message: string;
}

export interface AssetsReportBrokerSummaryOutput {
  brokerId: string;
  brokerName: string;
  cnpj: string;
  quantity: number;
  totalCost: number;
}

export interface AssetsReportItem {
  ticker: string;
  assetType: AssetType;
  totalQuantity: number;
  averagePrice: number;
  previousYearValue: number;
  currentYearValue: number;
  acquiredInYear: boolean;
  revenueClassification: RevenueClassification;
  status: ReportItemStatus;
  eligibilityReason: string;
  pendingIssues: PendingIssueOutput[];
  canCopy: boolean;
  description: string | null;
  brokersSummary: AssetsReportBrokerSummaryOutput[];
}

export interface GenerateAssetReportOutput {
  referenceDate: string;
  items: AssetsReportItem[];
}

export class GenerateAssetsReportUseCase {
  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly brokerRepository: BrokerRepository,
    private readonly assetRepository: AssetRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: GenerateAssetReportInput): Promise<GenerateAssetReportOutput> {
    const referenceDate = `${input.baseYear}-12-31`;

    const positions = await this.positionRepository.findAllByYear(input.baseYear);
    const previousYearPositions = await this.positionRepository.findAllByYear(input.baseYear - 1);
    const reportPositions = this.buildReportPositions({
      positions,
      previousYearPositions,
      baseYear: input.baseYear,
    });

    const brokers = await this.brokerRepository.findAll();
    const tickers = reportPositions.map((p) => p.ticker);
    const assetsData = await this.assetRepository.findByTickersList(tickers);
    const transactionsByTicker = new Map(
      await Promise.all(
        tickers.map(
          async (ticker) =>
            [ticker, await this.transactionRepository.findByTicker(ticker)] as const,
        ),
      ),
    );
    const reportGenerator = new ReportGenerator({
      brokers,
      assets: assetsData,
      transactionsByTicker,
      baseYear: input.baseYear,
      previousYearPositions,
    });
    const items = reportGenerator.generate(reportPositions);

    return {
      referenceDate,
      items,
    };
  }

  private buildReportPositions(input: {
    positions: AssetPosition[];
    previousYearPositions: AssetPosition[];
    baseYear: number;
  }): AssetPosition[] {
    const currentPositionsByTicker = new Map(
      input.positions.map((position) => [position.ticker, position]),
    );
    const soldPositions = input.previousYearPositions
      .filter((position) => !currentPositionsByTicker.has(position.ticker))
      .map((position) =>
        AssetPosition.create({
          ticker: position.ticker,
          assetType: position.assetType,
          year: input.baseYear,
          totalQuantity: Quantity.from(0),
          averagePrice: Money.from(0),
          brokerBreakdown: [],
        }),
      );

    return [...input.positions, ...soldPositions];
  }
}
