import type {
  GenerateAssetsReportQuery,
  GenerateAssetsReportResult,
} from '../../../shared/contracts/assets-report.contract';
import type { BrokerRepositoryPort } from '../repositories/broker.repository';
import type { PositionRepository } from '../repositories/position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { computePositionsFromTransactions } from '../services/compute-positions-from-transactions';
import { ReportGenerator } from '../../domain/tax-reporting/report-generator.service';

export class GenerateAssetsReportUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly positionRepository: PositionRepository,
    private readonly brokerRepository: BrokerRepositoryPort,
    private readonly reportGenerator: ReportGenerator,
  ) {}

  async execute(input: GenerateAssetsReportQuery): Promise<GenerateAssetsReportResult> {
    const referenceDate = `${input.baseYear}-12-31`;

    const transactions = await this.transactionRepository.findByPeriod({
      startDate: '0000-01-01',
      endDate: referenceDate,
    });

    const positionSnapshots = await computePositionsFromTransactions(
      transactions,
      this.positionRepository,
    );

    const brokers = await this.brokerRepository.findAll();
    const brokersMap = new Map(brokers.map((b) => [b.id, b]));

    const reportItems = this.reportGenerator.generate(
      positionSnapshots.map((position) => ({ position, brokersMap })),
    );

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
