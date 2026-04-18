import { AssetType } from '../../../../shared/types/domain';
import { AssetPosition } from '../entities/asset-position.entity';
import type { Transaction } from '../entities/transaction.entity';
import { TransactionType } from '../../../../shared/types/domain';

export class PositionCalculatorService {

  compute(
    transactions: Transaction[],
    basePositions: AssetPosition[],
    year: number,
  ): AssetPosition[] {
    const positionsByTicker = new Map<string, AssetPosition>(
      basePositions.map((p) => [p.ticker, p]),
    );

    for (const tx of transactions) {
      let position = positionsByTicker.get(tx.ticker);
      if (!position) {
        position = AssetPosition.create({
          ticker: tx.ticker,
          assetType: AssetType.Stock,
          year,
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
          position.applyBonus({
            quantity: tx.quantity,
            unitCost: tx.unitPrice,
            brokerId: tx.brokerId,
          });
          break;
        case TransactionType.TransferOut:
          position.applyTransferOut({ quantity: tx.quantity, brokerId: tx.brokerId });
          break;
        case TransactionType.TransferIn:
          position.applyTransferIn({ quantity: tx.quantity, brokerId: tx.brokerId });
          break;
        case TransactionType.Split:
          break;
        case TransactionType.ReverseSplit:
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

    return Array.from(positionsByTicker.values());
  }
}
