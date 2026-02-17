import { AssetPosition } from '../../../domain/portfolio/entities/asset-position.entity';
import type { AssetPositionRepository } from '../../../application/repositories/asset-position.repository';
import type { TransactionRepository } from '../../../application/repositories/transaction.repository';
import { RecalculatePositionInput } from './recalculate-position.input';
import { PositionCalculatorService } from '../../../domain/portfolio/services/position-calculator.service';
import { RecalculatePositionOutput } from './recalculate-position.output';

export class RecalculatePositionUseCase {
  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: RecalculatePositionInput): Promise<RecalculatePositionOutput> {
    const allTransactions = await this.transactionRepository.findByTicker(input.ticker);
    const yearEnd = `${input.year}-12-31`;
    const transactions = allTransactions.filter((tx) => tx.date <= yearEnd);

    const position = await this.positionRepository.findByTickerAndYear(
      input.ticker,
      input.year,
    );

    if (!position) {
      throw new Error(`Position not found for ticker ${input.ticker} and year ${input.year}`);
    }

    const positionCalculator = new PositionCalculatorService();
    const positions = positionCalculator.compute(transactions, [position], input.year);

    await this.positionRepository.save(positions[0]);
    return {
      totalQuantity: positions[0].totalQuantity,
      averagePrice: positions[0].averagePrice,
    }
  }
}
