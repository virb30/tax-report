import { AssetType } from '../../../shared/types/domain';
import { AssetPosition } from '../../domain/portfolio/asset-position.entity';
import type { Transaction } from '../../domain/portfolio/transaction.entity';
import { TransactionType } from '../../../shared/types/domain';
import type { PositionRepository } from '../repositories/position.repository';

export async function computePositionsFromTransactions(
  transactions: Transaction[],
  positionRepository: PositionRepository,
  year: number,
): Promise<AssetPosition[]> {
  const positions = await positionRepository.findAllByYear(year);
  const positionsByTicker = new Map<string, AssetPosition>(positions.map((position) => [position.ticker, position]));
  positions.forEach((position) => {
    positionsByTicker.set(position.ticker, position);
  });

  transactions.forEach((tx) => {
    let position = positionsByTicker.get(tx.ticker);
    if (!position) {
      position = AssetPosition.create({
        ticker: tx.ticker,
        assetType: AssetType.Stock,
        year: year,
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
  });

  return Array.from(positionsByTicker.values());
}
