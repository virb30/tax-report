import { AssetType } from '../../../shared/types/domain';
import { AssetPosition } from '../../domain/portfolio/asset-position.entity';
import type { TransactionRecord } from '../../domain/portfolio/transaction.entity';
import { TransactionType } from '../../../shared/types/domain';
import type { AssetPositionRepository } from '../repositories/asset-position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { Uuid } from '../../domain/shared/uuid.vo';

export type RecalculatePositionInput = {
  ticker: string;
  year: number;
};

export class RecalculatePositionUseCase {
  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: RecalculatePositionInput): Promise<void> {
    const allTransactions = await this.transactionRepository.findByTicker(input.ticker);
    const yearEnd = `${input.year}-12-31`;
    const transactions = allTransactions.filter((tx) => tx.date <= yearEnd);

    const existingSnapshot = await this.positionRepository.findByTickerAndYear(
      input.ticker,
      input.year,
    );
    const assetType: AssetType = existingSnapshot?.assetType ?? AssetType.Stock;

    const position = AssetPosition.create({
      ticker: input.ticker,
      assetType,
      totalQuantity: 0,
      year: input.year,
      averagePrice: 0,
      brokerBreakdown: [],
    });

    for (const tx of transactions) {
      this.applyTransaction(position, tx);
    }

    await this.positionRepository.save(position);
  }

  private applyTransaction(position: AssetPosition, tx: TransactionRecord): void {
    switch (tx.type) {
      case TransactionType.Buy:
        position.applyBuy({
          quantity: tx.quantity,
          unitPrice: tx.unitPrice,
          fees: tx.fees,
          brokerId: Uuid.from(tx.brokerId),
        });
        break;
      case TransactionType.Sell:
        position.applySell({ quantity: tx.quantity, brokerId: Uuid.from(tx.brokerId) });
        break;
      case TransactionType.Bonus:
        position.applyBonus({ quantity: tx.quantity, brokerId: Uuid.from(tx.brokerId) });
        break;
      case TransactionType.InitialBalance:
        position.applyInitialBalance({
          quantity: tx.quantity,
          averagePrice: tx.unitPrice,
          brokerId: Uuid.from(tx.brokerId),
        });
        break;
      default: {
        const _exhaustive: never = tx.type;
        throw new Error(`Unsupported transaction type: ${String(_exhaustive)}`);
      }
    }
  }
}
