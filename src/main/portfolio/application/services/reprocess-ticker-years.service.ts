import type { AssetType } from '../../../shared/types/domain';
import type { RecalculatePositionUseCase } from '../use-cases/recalculate-position.use-case';

export class ReprocessTickerYearsService {
  constructor(private readonly recalculatePositionUseCase: RecalculatePositionUseCase) {}

  async execute(input: {
    ticker: string;
    assetType: AssetType;
    affectedYears: number[];
  }): Promise<{ reprocessedCount: number }> {
    for (const year of input.affectedYears) {
      await this.recalculatePositionUseCase.execute({
        ticker: input.ticker,
        year,
        assetType: input.assetType,
      });
    }

    return {
      reprocessedCount: input.affectedYears.length,
    };
  }
}
