import type {
  SetManualBaseCommand,
  SetManualBaseResult,
} from '@shared/contracts/manual-base.contract';
import { AssetPosition } from '../../domain/portfolio/asset-position';
import type { PortfolioPositionRepositoryPort } from '../repositories/portfolio-position.repository.interface';

export class SetManualBaseUseCase {
  constructor(private readonly portfolioPositionRepository: PortfolioPositionRepositoryPort) {}

  async execute(input: SetManualBaseCommand): Promise<SetManualBaseResult> {
    const manualBaseSnapshot = AssetPosition.create({
      ticker: input.ticker,
      broker: input.broker,
      assetType: input.assetType,
      quantity: input.quantity,
      averagePrice: input.averagePrice,
      isManualBase: true,
    }).toSnapshot();

    await this.portfolioPositionRepository.save(manualBaseSnapshot);

    return {
      ticker: manualBaseSnapshot.ticker,
      broker: manualBaseSnapshot.broker,
      quantity: manualBaseSnapshot.quantity,
      averagePrice: manualBaseSnapshot.averagePrice,
      isManualBase: manualBaseSnapshot.isManualBase,
    };
  }
}
