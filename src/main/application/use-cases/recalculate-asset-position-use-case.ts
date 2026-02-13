import type { AssetType} from '../../../shared/types/domain';
import { OperationType } from '../../../shared/types/domain';
import { AssetPosition } from '../../domain/portfolio/asset-position';
import type {
  PortfolioPositionRepositoryPort,
  TradeOperationQueryPort,
} from '../repositories/portfolio-ports';

export type RecalculateAssetPositionInput = {
  ticker: string;
  broker: string;
  assetType: AssetType;
};

export class RecalculateAssetPositionUseCase {
  constructor(
    private readonly portfolioPositionRepository: PortfolioPositionRepositoryPort,
    private readonly tradeOperationQuery: TradeOperationQueryPort,
  ) {}

  async execute(input: RecalculateAssetPositionInput): Promise<void> {
    const currentPosition = await this.portfolioPositionRepository.findByTickerAndBroker({
      ticker: input.ticker,
      broker: input.broker,
    });

    const initialPosition =
      currentPosition ??
      AssetPosition.create({
        ticker: input.ticker,
        broker: input.broker,
        assetType: input.assetType,
        quantity: 0,
        averagePrice: 0,
        isManualBase: false,
      }).toSnapshot();

    const position = AssetPosition.create(initialPosition);
    const trades = await this.tradeOperationQuery.findTradesByTickerAndBroker({
      ticker: input.ticker,
      broker: input.broker,
    });

    for (const trade of trades) {
      if (trade.operationType === OperationType.Buy) {
        position.applyBuy({
          quantity: trade.quantity,
          unitPrice: trade.unitPrice,
          operationalCosts: trade.operationalCosts,
        });
        continue;
      }

      if (trade.operationType === OperationType.Sell) {
        position.applySell({
          quantity: trade.quantity,
        });
        continue;
      }

      throw new Error('Unsupported operation type.');
    }

    await this.portfolioPositionRepository.save(position.toSnapshot());
  }
}
