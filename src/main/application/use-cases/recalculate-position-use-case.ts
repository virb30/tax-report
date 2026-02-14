import { AssetType } from '../../../shared/types/domain';
import { AssetPosition } from '../../domain/portfolio/asset-position.entity';
import type { TransactionRecord } from '../../domain/portfolio/transaction.entity';
import { TransactionType } from '../../../shared/types/domain';
import type { PositionRepository } from '../repositories/position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';

export type RecalculatePositionInput = {
  ticker: string;
};

export class RecalculatePositionUseCase {
  constructor(
    private readonly positionRepository: PositionRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: RecalculatePositionInput): Promise<void> {
    const transactions = await this.transactionRepository.findByTicker(input.ticker);
    const existingSnapshot = await this.positionRepository.findByTicker(input.ticker);
    const assetType: AssetType = existingSnapshot?.assetType ?? AssetType.Stock;

    const position = AssetPosition.create({
      ticker: input.ticker,
      assetType,
      totalQuantity: 0,
      averagePrice: 0,
      brokerBreakdown: [],
    });

    for (const tx of transactions) {
      this.applyTransaction(position, tx);
    }

    await this.positionRepository.save(position.toSnapshot());
  }

  private applyTransaction(position: AssetPosition, tx: TransactionRecord): void {
    switch (tx.type) {
      case TransactionType.Buy:
        position.applyBuy({
          quantity: tx.quantity,
          unitPrice: tx.unitPrice,
          fees: tx.fees,
          brokerId: tx.brokerId,
        });
        break;
      case TransactionType.Sell:
        position.applySell({ quantity: tx.quantity, brokerId: tx.brokerId });
        break;
      case TransactionType.Bonus:
        position.applyBonus({ quantity: tx.quantity, brokerId: tx.brokerId });
        break;
      case TransactionType.InitialBalance:
        position.applyInitialBalance({
          quantity: tx.quantity,
          averagePrice: tx.unitPrice,
          brokerId: tx.brokerId,
        });
        break;
      default: {
        const _exhaustive: never = tx.type;
        throw new Error(`Unsupported transaction type: ${String(_exhaustive)}`);
      }
    }
  }
}
