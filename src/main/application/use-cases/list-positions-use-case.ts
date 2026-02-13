import type { ListPositionsResult } from '@shared/contracts/list-positions.contract';
import type { PortfolioPositionRepositoryPort } from '../repositories/portfolio-position.repository.interface';

export class ListPositionsUseCase {
  constructor(private readonly portfolioPositionRepository: PortfolioPositionRepositoryPort) {}

  async execute(): Promise<ListPositionsResult> {
    const snapshots = await this.portfolioPositionRepository.findAll();
    const items = snapshots.map((snapshot) => ({
      ticker: snapshot.ticker,
      broker: snapshot.broker,
      assetType: snapshot.assetType,
      quantity: snapshot.quantity,
      averagePrice: snapshot.averagePrice,
      totalCost: snapshot.quantity * snapshot.averagePrice,
      isManualBase: snapshot.isManualBase,
    }));

    return { items };
  }
}
