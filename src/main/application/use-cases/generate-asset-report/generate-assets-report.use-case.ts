import type { BrokerRepository } from '../../repositories/broker.repository';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { AssetRepository } from '../../repositories/asset.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { ReportGenerator } from '../../../domain/tax-reporting/report-generator.service';
import type { GenerateAssetReportInput } from './generate-asset-report.input';
import type { GenerateAssetReportOutput } from './generate-asset-report.output';

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

    const brokers = await this.brokerRepository.findAll();
    const tickers = positions.map((p) => p.ticker);
    const assetsData = await this.assetRepository.findByTickersList(tickers);
    const transactionsByTicker = new Map(
      await Promise.all(
        tickers.map(async (ticker) => [ticker, await this.transactionRepository.findByTicker(ticker)] as const),
      ),
    );
    const reportGenerator = new ReportGenerator({
      brokers,
      assets: assetsData,
      transactionsByTicker,
      baseYear: input.baseYear,
    });
    const items = reportGenerator.generate(positions);

    return {
      referenceDate,
      items,
    };
  }
}
