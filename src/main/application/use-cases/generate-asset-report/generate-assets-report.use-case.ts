import type { BrokerRepository } from '../../repositories/broker.repository';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { AssetRepository } from '../../repositories/asset.repository';
import type { ReportGenerator } from '../../services/report-generator/report-generator.service';
import type { GenerateAssetReportInput } from './generate-asset-report.input';
import { GenerateAssetReportOutput } from './generate-asset-report.output';

export class GenerateAssetsReportUseCase {
  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly brokerRepository: BrokerRepository,
    private readonly assetRepository: AssetRepository,
    private readonly reportGenerator: ReportGenerator,
  ) {}

  async execute(input: GenerateAssetReportInput): Promise<GenerateAssetReportOutput> {
    const referenceDate = `${input.baseYear}-12-31`;

    const positions = await this.positionRepository.findAllByYear(input.baseYear);

    const brokers = await this.brokerRepository.findAll();
    const brokersMap = new Map(brokers.map((b) => [b.id.value, b]));
    const tickers = positions.map((p) => p.ticker);

    const assetsData = await this.assetRepository.findByTickersList(tickers);
    const assetsMap = new Map(assetsData.map((a) => [a.ticker, a]));

    const reportInputs = 
      positions.map((position) => {
        const tickerData = assetsMap.get(position.ticker);
        const issuerCnpj = tickerData?.issuerCnpj ?? 'N/A';
        return { position, brokersMap, issuerCnpj };
      })

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
