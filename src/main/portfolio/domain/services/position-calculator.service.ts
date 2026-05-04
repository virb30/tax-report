import {
  AssetType,
  type AveragePriceFeeMode,
  TransactionType,
} from '../../../../shared/types/domain';
import { AssetPosition } from '../entities/asset-position.entity';
import type { Transaction } from '../entities/transaction.entity';
import { Money } from '../value-objects/money.vo';

type ComputePositionsInput = {
  transactions: Transaction[];
  basePositions: AssetPosition[];
  year: number;
  averagePriceFeeMode?: AveragePriceFeeMode;
};

export class PositionCalculatorService {
  compute(input: ComputePositionsInput): AssetPosition[] {
    const averagePriceFeeMode = input.averagePriceFeeMode ?? 'include';
    const positionsByTicker = new Map<string, AssetPosition>(
      input.basePositions.map((p) => [p.ticker, p]),
    );

    for (const tx of input.transactions) {
      let position = positionsByTicker.get(tx.ticker);
      if (!position) {
        position = AssetPosition.create({
          ticker: tx.ticker,
          assetType: AssetType.Stock,
          year: input.year,
        });
        positionsByTicker.set(tx.ticker, position);
      }

      switch (tx.type) {
        case TransactionType.Buy:
          position.applyBuy({
            quantity: tx.quantity,
            unitPrice: tx.unitPrice,
            fees: this.resolveBuyFees(tx, averagePriceFeeMode),
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
          position.applySplit({ ratio: tx.quantity.toNumber() });
          break;
        case TransactionType.ReverseSplit:
          position.applyReverseSplit({ ratio: tx.quantity.toNumber() });
          break;
        case TransactionType.InitialBalance:
          position.applyInitialBalance({
            quantity: tx.quantity,
            averagePrice: tx.unitPrice,
            brokerId: tx.brokerId,
          });
          break;
        case TransactionType.FractionAuction:
          break;
        default: {
          const _exhaustive: never = tx.type;
          throw new Error(`Unsupported transaction type: ${String(_exhaustive)}`);
        }
      }
    }

    return Array.from(positionsByTicker.values());
  }

  private resolveBuyFees(tx: Transaction, averagePriceFeeMode: AveragePriceFeeMode): Money {
    if (averagePriceFeeMode === 'ignore') {
      return Money.from(0);
    }

    return tx.fees;
  }
}
