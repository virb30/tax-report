import type { RecalculatePositionInput } from './recalculate-position.input';
import type { RecalculatePositionOutput } from './recalculate-position.output';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { AssetType } from '../../../../shared/types/domain';
import { AssetPosition } from '../../../domain/portfolio/entities/asset-position.entity';
import { PositionCalculatorService } from '../../../domain/portfolio/services/position-calculator.service';

export class RecalculatePositionUseCase {
  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: RecalculatePositionInput): Promise<RecalculatePositionOutput> {
    const allTransactions = await this.transactionRepository.findByTicker(input.ticker);
    const yearEnd = `${input.year}-12-31`;
    const transactions = this.orderTransactions(
      allTransactions.filter((transaction) => transaction.date <= yearEnd),
    );

    const currentPosition = await this.positionRepository.findByTickerAndYear(input.ticker, input.year);
    const basePositions = [this.createRecalculationBasePosition(input, currentPosition)];

    const positionCalculator = new PositionCalculatorService();
    const positions = positionCalculator.compute(transactions, basePositions, input.year);

    if (positions.length === 0) {
      return {
        totalQuantity: '0',
        averagePrice: '0',
      };
    }

    const recalculatedPosition = positions[0];

    await this.positionRepository.save(recalculatedPosition);

    return {
      totalQuantity: recalculatedPosition.totalQuantity.getAmount(),
      averagePrice: recalculatedPosition.averagePrice.getAmount(),
    };
  }

  private createRecalculationBasePosition(
    input: RecalculatePositionInput,
    currentPosition: AssetPosition | null,
  ): AssetPosition {
    return AssetPosition.create({
      ticker: input.ticker,
      assetType: input.assetType ?? currentPosition?.assetType ?? AssetType.Stock,
      year: input.year,
    });
  }

  private orderTransactions(transactions: Awaited<ReturnType<TransactionRepository['findByTicker']>>) {
    return [...transactions].sort((left, right) => {
      const dateOrder = left.date.localeCompare(right.date);
      if (dateOrder !== 0) {
        return dateOrder;
      }

      if (left.isInitialBalance() === right.isInitialBalance()) {
        return 0;
      }

      return left.isInitialBalance() ? -1 : 1;
    });
  }
}
