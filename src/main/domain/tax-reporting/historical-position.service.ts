import { AssetPosition } from '../portfolio/entities/asset-position.entity';
import type { Transaction } from '../portfolio/entities/transaction.entity';
import { PositionCalculatorService } from '../portfolio/services/position-calculator.service';
import type { AssetType } from '../../../shared/types/domain';

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

    const [position] = this.positionCalculator.compute(
      historicalTransactions,
      [AssetPosition.create({ ticker, assetType, year })],
      year,
    );

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
