import { AssetPosition } from '../../portfolio/domain/entities/asset-position.entity';
import type { Transaction } from '../../portfolio/domain/entities/transaction.entity';
import { PositionCalculatorService } from '../../portfolio/domain/services/position-calculator.service';
import type { AssetType } from '../../shared/types/domain';

export class HistoricalPositionService {
  private readonly positionCalculator = new PositionCalculatorService();

  reconstructYearEndPosition(
    ticker: string,
    assetType: AssetType,
    year: number,
    transactions: Transaction[],
  ): AssetPosition | null {
    const cutoff = `${year}-12-31`;
    const historicalTransactions = this.orderTransactions(
      transactions.filter((transaction) => transaction.date <= cutoff),
    );

    if (historicalTransactions.length === 0) {
      return null;
    }

    const [position] = this.positionCalculator.compute({
      transactions: historicalTransactions,
      basePositions: [AssetPosition.create({ ticker, assetType, year })],
      year,
    });

    return position ?? null;
  }

  private orderTransactions(transactions: Transaction[]): Transaction[] {
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
