import { BrokerRepository } from '../../repositories/broker.repository';
import { AssetPositionRepository } from '../../repositories/asset-position.repository';
import { AssetRepository } from '../../repositories/asset.repository';
import { ReportGenerator } from '../../../domain/tax-reporting/report-generator.service';
import type { GenerateAssetReportInput } from './generate-asset-report.input';
import { GenerateAssetReportOutput } from './generate-asset-report.output';

export class GenerateAssetsReportUseCase {
  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly brokerRepository: BrokerRepository,
    private readonly assetRepository: AssetRepository,
  ) {}

  async execute(input: GenerateAssetReportInput): Promise<GenerateAssetReportOutput> {
    const referenceDate = `${input.baseYear}-12-31`;

    const positions = await this.positionRepository.findAllByYear(input.baseYear);

    const brokers = await this.brokerRepository.findAll();
    const tickers = positions.map((p) => p.ticker);
    const assetsData = await this.assetRepository.findByTickersList(tickers);

    const reportGenerator = new ReportGenerator(brokers, assetsData);
    const reportItems = reportGenerator.generate(positions);

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
