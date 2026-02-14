import type { ListPositionsResult } from '@shared/contracts/list-positions.contract';
import type { PositionRepository } from '../repositories/position.repository';
import type { BrokerRepositoryPort } from '../repositories/broker.repository';

export class ListPositionsUseCase {
  constructor(
    private readonly positionRepository: PositionRepository,
    private readonly brokerRepository: BrokerRepositoryPort,
  ) {}

  async execute(): Promise<ListPositionsResult> {
    const snapshots = await this.positionRepository.findAll();

    const items = await Promise.all(
      snapshots.map(async (snapshot) => {
        const brokerBreakdown = await Promise.all(
          snapshot.brokerBreakdown.map(async (allocation) => {
            const broker = await this.brokerRepository.findById(allocation.brokerId);
            return {
              brokerId: allocation.brokerId,
              brokerName: broker?.name ?? allocation.brokerId,
              brokerCnpj: broker?.cnpj ?? '',
              quantity: allocation.quantity,
            };
          }),
        );

        const totalCost = snapshot.totalQuantity * snapshot.averagePrice;

        return {
          ticker: snapshot.ticker,
          assetType: snapshot.assetType,
          totalQuantity: snapshot.totalQuantity,
          averagePrice: snapshot.averagePrice,
          totalCost,
          brokerBreakdown,
        };
      }),
    );

    return { items };
  }
}
