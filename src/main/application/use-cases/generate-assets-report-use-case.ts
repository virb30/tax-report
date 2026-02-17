import type {
  GenerateAssetsReportQuery,
  GenerateAssetsReportResult,
} from '../../../shared/contracts/assets-report.contract';
import type { BrokerRepository } from '../repositories/broker.repository';
import type { AssetPositionRepository } from '../repositories/asset-position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import type { TickerDataRepository } from '../repositories/ticker-data.repository';
import { computePositionsFromTransactions } from '../services/compute-positions-from-transactions';
import type { ReportGenerator } from '../../domain/tax-reporting/report-generator.service';

export class GenerateAssetsReportUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly positionRepository: AssetPositionRepository,
    private readonly brokerRepository: BrokerRepository,
    private readonly tickerDataRepository: TickerDataRepository,
    private readonly reportGenerator: ReportGenerator,
  ) {}

  async execute(input: GenerateAssetsReportQuery): Promise<GenerateAssetsReportResult> {
    const referenceDate = `${input.baseYear}-12-31`;

    const transactions = await this.transactionRepository.findByPeriod({
      startDate: '0000-01-01',
      endDate: referenceDate,
    });

    const basePositions = await this.positionRepository.findAllByYear(input.baseYear);

    const positions = await computePositionsFromTransactions(
      transactions,
      basePositions,
      input.baseYear,
    );

    const brokers = await this.brokerRepository.findAll();
    const brokersMap = new Map(brokers.map((b) => [b.id.value, b]));

    const reportInputs = await Promise.all(
      positions.map(async (position) => {
        const tickerData = await this.tickerDataRepository.findByTicker(position.ticker);
        const issuerCnpj = tickerData?.cnpj ?? 'N/A';
        return { position, brokersMap, issuerCnpj };
      }),
    );

    const reportItems = this.reportGenerator.generate(reportInputs);

    const items = reportItems.map((item) => ({
      ticker: item.ticker,
      assetType: item.assetType,
      totalQuantity: item.totalQuantity,
      averagePrice: item.averagePrice,
      totalCost: item.totalCost,
      revenueClassification: item.revenueClassification,
      allocations: item.allocations,
    }));

    return {
      referenceDate,
      items,
    };
  }
}
