import type { RecalculatePositionInput } from './recalculate-position.input';
import type { RecalculatePositionOutput } from './recalculate-position.output';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { PositionCalculatorService } from '../../../domain/portfolio/services/position-calculator.service';

export class RecalculatePositionUseCase {
  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: RecalculatePositionInput): Promise<RecalculatePositionOutput> {
    const allTransactions = await this.transactionRepository.findByTicker(input.ticker);
    const yearEnd = `${input.year}-12-31`;
    const transactions = allTransactions.filter((transaction) => transaction.date <= yearEnd);

    const position = await this.positionRepository.findByTickerAndYear(input.ticker, input.year);
    const basePositions = position ? [position] : [];

    const positionCalculator = new PositionCalculatorService();
    const positions = positionCalculator.compute(transactions, basePositions, input.year);
    
    if (positions.length === 0) {
      return {
        totalQuantity: 0,
        averagePrice: 0,
      };
    }

    const recalculatedPosition = positions[0];

    await this.positionRepository.save(recalculatedPosition);

    return {
      totalQuantity: recalculatedPosition.totalQuantity,
      averagePrice: recalculatedPosition.averagePrice,
    };
  }
}
