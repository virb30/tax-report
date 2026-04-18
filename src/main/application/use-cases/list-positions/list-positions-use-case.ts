import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { BrokerRepository } from '../../repositories/broker.repository';
import { ListPositionsInput } from './list-positions.input';
import { ListPositionsOutput } from './list-positions.output';

export class ListPositionsUseCase {
  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly brokerRepository: BrokerRepository,
  ) {}

  async execute(input: ListPositionsInput): Promise<ListPositionsOutput> {
    const positions = await this.positionRepository.findAllByYear(input.baseYear);
    const brokers = await this.brokerRepository.findAll();
    const brokersMap = new Map(brokers.map((broker) => [broker.id.value, broker]));

    const items = positions.map(position => {
      const brokerBreakdown = position.brokerBreakdown.map((allocation) => {
        const broker = brokersMap.get(allocation.brokerId.value);
        return {
          brokerId: allocation.brokerId.value,
          brokerName: broker?.name ?? allocation.brokerId.value,
          brokerCnpj: broker?.cnpj?.value ?? '',
          quantity: allocation.quantity,
        };
      });
      return {
        ticker: position.ticker,
        assetType: position.assetType,
        totalQuantity: position.totalQuantity,
        averagePrice: position.averagePrice,
        totalCost: position.totalQuantity * position.averagePrice,
        brokerBreakdown,
      };
    });

    return { items };
  }
}
