import type { AssetRepository } from '../../../database/repositories/asset-repository';
import type { OperationRepository } from '../../../database/repositories/operation-repository';
import type {
  PortfolioPositionRepositoryPort,
} from '../../../application/repositories/portfolio-position.repository.interface';
import type { TradeOperationQueryPort, RecalculableTrade } from '../../../application/queries/trade-operation.query.interface';
import type { AssetPositionSnapshot } from '../../../domain/portfolio/asset-position';

export class LegacyPortfolioAcl
  implements PortfolioPositionRepositoryPort, TradeOperationQueryPort
{
  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly operationRepository: OperationRepository,
  ) {}

  async findByTickerAndBroker(input: {
    ticker: string;
    broker: string;
  }): Promise<AssetPositionSnapshot | null> {
    const asset = await this.assetRepository.findByTickerAndBroker(input.ticker, input.broker);
    if (!asset) {
      return null;
    }

    return {
      ticker: asset.ticker,
      broker: asset.broker,
      assetType: asset.assetType,
      quantity: asset.quantity,
      averagePrice: asset.averagePrice,
      isManualBase: asset.isManualBase,
    };
  }

  async save(snapshot: AssetPositionSnapshot): Promise<void> {
    const existingAsset = await this.assetRepository.findByTickerAndBroker(
      snapshot.ticker,
      snapshot.broker,
    );

    if (existingAsset) {
      await this.assetRepository.update(existingAsset.id, {
        assetType: snapshot.assetType,
        quantity: snapshot.quantity,
        averagePrice: snapshot.averagePrice,
        isManualBase: snapshot.isManualBase,
      });
      return;
    }

    await this.assetRepository.create({
      ticker: snapshot.ticker,
      broker: snapshot.broker,
      assetType: snapshot.assetType,
      quantity: snapshot.quantity,
      averagePrice: snapshot.averagePrice,
      isManualBase: snapshot.isManualBase,
      name: null,
      cnpj: null,
    });
  }

  async findAll(): Promise<AssetPositionSnapshot[]> {
    const assets = await this.assetRepository.findAll();
    return assets.map((asset) => ({
      ticker: asset.ticker,
      broker: asset.broker,
      assetType: asset.assetType,
      quantity: asset.quantity,
      averagePrice: asset.averagePrice,
      isManualBase: asset.isManualBase,
    }));
  }

  async findTradesByTickerAndBroker(input: {
    ticker: string;
    broker: string;
  }): Promise<RecalculableTrade[]> {
    const operations = await this.operationRepository.findByTicker(input.ticker);
    return operations
      .filter((operation) => operation.broker === input.broker)
      .map((operation) => ({
        operationType: operation.operationType,
        quantity: operation.quantity,
        unitPrice: operation.unitPrice,
        operationalCosts: operation.operationalCosts,
      }));
  }

}
