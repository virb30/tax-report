import { AssetType } from '../../../shared/types/domain';
import { AssetPosition } from '../../domain/portfolio/asset-position.entity';
import type { TransactionRecord } from '../../domain/portfolio/transaction.entity';
import { TransactionType } from '../../../shared/types/domain';
import type { PositionRepository } from '../repositories/position.repository';

export type PositionSnapshot = {
  ticker: string;
  assetType: AssetType;
  totalQuantity: number;
  averagePrice: number;
  brokerBreakdown: Array<{ brokerId: string; quantity: number }>;
};

export async function computePositionsFromTransactions(
  transactions: TransactionRecord[],
  positionRepository: PositionRepository,
): Promise<PositionSnapshot[]> {
  const positionsByTicker = new Map<string, AssetPosition>();

  for (const tx of transactions) {
    let position = positionsByTicker.get(tx.ticker);
    if (!position) {
      const existingSnapshot = await positionRepository.findByTicker(tx.ticker);
      const assetType: AssetType = existingSnapshot?.assetType ?? AssetType.Stock;
      position = AssetPosition.create({
        ticker: tx.ticker,
        assetType,
        totalQuantity: 0,
        averagePrice: 0,
        brokerBreakdown: [],
      });
      positionsByTicker.set(tx.ticker, position);
    }

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

  return Array.from(positionsByTicker.values()).map((p) => p.toSnapshot());
}
