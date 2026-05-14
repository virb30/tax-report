import { AssetType } from '../../../shared/types/domain';
import type { AssetPositionRepository } from '../repositories/asset-position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { AssetPosition } from '../../domain/entities/asset-position.entity';
import { PositionCalculatorService } from '../../domain/services/position-calculator.service';
import { Money } from '../../domain/value-objects/money.vo';
import { Quantity } from '../../domain/value-objects/quantity.vo';

type SyncInitialBalanceDocumentPositionInput = {
  ticker: string;
  year: number;
  assetType?: AssetType;
};

type SyncInitialBalanceDocumentPositionOutput = {
  totalQuantity: Quantity;
  averagePrice: Money;
};

export class InitialBalanceDocumentPositionSyncService {
  private readonly positionCalculator = new PositionCalculatorService();

  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async sync(
    input: SyncInitialBalanceDocumentPositionInput,
  ): Promise<SyncInitialBalanceDocumentPositionOutput> {
    const existingPosition = await this.positionRepository.findByTickerAndYear(
      input.ticker,
      input.year,
    );
    const allTransactions = await this.transactionRepository.findByTicker(input.ticker);
    const yearEnd = `${input.year}-12-31`;
    const transactions = this.orderTransactions(
      allTransactions.filter((transaction) => transaction.date <= yearEnd),
    );

    if (transactions.length === 0) {
      await this.positionRepository.delete(input.ticker, input.year);
      return {
        totalQuantity: Quantity.from(0),
        averagePrice: Money.from(0),
      };
    }

    const basePosition = AssetPosition.create({
      ticker: input.ticker,
      assetType: input.assetType ?? existingPosition?.assetType ?? AssetType.Stock,
      year: input.year,
    });
    const [position] = this.positionCalculator.compute({
      transactions,
      basePositions: [basePosition],
      year: input.year,
    });

    if (!position || position.totalQuantity.isZero()) {
      await this.positionRepository.delete(input.ticker, input.year);
      return {
        totalQuantity: Quantity.from(0),
        averagePrice: Money.from(0),
      };
    }

    await this.positionRepository.save(position);

    return {
      totalQuantity: position.totalQuantity,
      averagePrice: position.averagePrice,
    };
  }

  private orderTransactions(
    transactions: Awaited<ReturnType<TransactionRepository['findByTicker']>>,
  ) {
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
