import { AssetType, SourceType, TransactionType } from '../../../shared/types/domain';
import { Transaction } from '../portfolio/entities/transaction.entity';
import { Money } from '../portfolio/value-objects/money.vo';
import { Quantity } from '../portfolio/value-objects/quantity.vo';
import { Uuid } from '../shared/uuid.vo';
import { HistoricalPositionService } from './historical-position.service';

describe('HistoricalPositionService', () => {
  const service = new HistoricalPositionService();

  it('returns null when no historical transactions exist before the cutoff', () => {
    expect(service.reconstructYearEndPosition('PETR4', AssetType.Stock, 2025, [])).toBeNull();
  });

  it('orders same-day initial balance before later operations', () => {
    const brokerId = Uuid.create();
    const position = service.reconstructYearEndPosition('PETR4', AssetType.Stock, 2025, [
      Transaction.create({
        date: '2025-01-01',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: Quantity.from(5),
        unitPrice: Money.from(20),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2025-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'PETR4',
        quantity: Quantity.from(10),
        unitPrice: Money.from(10),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    expect(position?.totalQuantity.getAmount()).toBe('15');
  });
});
