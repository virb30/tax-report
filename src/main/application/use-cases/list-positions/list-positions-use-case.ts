import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { AssetRepository } from '../../repositories/asset.repository';
import type { BrokerRepository } from '../../repositories/broker.repository';
import type { ListPositionsInput } from './list-positions.input';
import type { ListPositionsOutput } from './list-positions.output';

export class ListPositionsUseCase {
  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly brokerRepository: BrokerRepository,
    private readonly assetRepository: AssetRepository,
  ) {}

  async execute(input: ListPositionsInput): Promise<ListPositionsOutput> {
    const positions = await this.positionRepository.findAllByYear(input.baseYear);
    const tickers = positions.map((position) => position.ticker);
    const [brokers, assets] = await Promise.all([
      this.brokerRepository.findAll(),
      this.assetRepository.findByTickersList(tickers),
    ]);
    const brokersMap = new Map(brokers.map((broker) => [broker.id.value, broker]));
    const assetTypeByTicker = new Map(
      assets
        .filter((asset) => asset.assetType !== null)
        .map((asset) => [asset.ticker, asset.assetType]),
    );

    const items = positions.map((position) => {
      const brokerBreakdown = position.brokerBreakdown.map((allocation) => {
        const broker = brokersMap.get(allocation.brokerId.value);
        return {
          brokerId: allocation.brokerId.value,
          brokerName: broker?.name ?? allocation.brokerId.value,
          brokerCnpj: broker?.cnpj?.value ?? '',
          quantity: allocation.quantity.getAmount(),
        };
      });
      return {
        ticker: position.ticker,
        assetType: assetTypeByTicker.get(position.ticker) ?? position.assetType,
        totalQuantity: position.totalQuantity.getAmount(),
        averagePrice: position.averagePrice.getAmount(),
        totalCost: position.totalCost.getAmount(),
        brokerBreakdown,
      };
    });

    return { items };
  }
}
