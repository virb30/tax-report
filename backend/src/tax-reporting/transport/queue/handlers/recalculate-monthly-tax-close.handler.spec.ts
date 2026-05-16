import { mock, mockReset } from 'jest-mock-extended';
import { AssetTaxClassificationChangedEvent } from '../../../../shared/domain/events/asset-tax-classification-changed.event';
import { ConsolidatedPositionImportedEvent } from '../../../../shared/domain/events/consolidated-position-imported.event';
import { TransactionFeesReallocatedEvent } from '../../../../shared/domain/events/transaction-fees-reallocated.event';
import { TransactionsImportedEvent } from '../../../../shared/domain/events/transactions-imported.event';
import { MemoryQueueAdapter } from '../../../../shared/infra/events/memory-queue.adapter';
import { RecalculateMonthlyTaxHistoryUseCase } from '../../../application/use-cases/recalculate-monthly-tax-history.use-case';
import { RecalculateMonthlyTaxCloseHandler } from './recalculate-monthly-tax-close.handler';

describe('RecalculateMonthlyTaxCloseHandler', () => {
  const recalculateMonthlyTaxHistoryUseCase = mock<RecalculateMonthlyTaxHistoryUseCase>();
  
  beforeEach(() => {
    mockReset(recalculateMonthlyTaxHistoryUseCase);
    jest.clearAllMocks();
  });

  it('subscribes to supported upstream events in the constructor', () => {
    const queue = new MemoryQueueAdapter();

    new RecalculateMonthlyTaxCloseHandler(queue, recalculateMonthlyTaxHistoryUseCase);

    expect(queue.consumers.get(ConsolidatedPositionImportedEvent.name)).toBeDefined();
    expect(queue.consumers.get(TransactionsImportedEvent.name)).toBeDefined();
    expect(queue.consumers.get(TransactionFeesReallocatedEvent.name)).toBeDefined();
    expect(queue.consumers.get(AssetTaxClassificationChangedEvent.name)).toBeDefined();
  });

  it('reacts to asset classification changes with the expected start year', async () => {
    const queue = new MemoryQueueAdapter();
    new RecalculateMonthlyTaxCloseHandler(queue, recalculateMonthlyTaxHistoryUseCase);

    await queue.publish(
      new AssetTaxClassificationChangedEvent({ ticker: 'HGLG11', earliestYear: 2024 }),
    );

    expect(recalculateMonthlyTaxHistoryUseCase.execute).toHaveBeenCalledWith({
      startYear: 2024,
      reason: 'asset_type_changed',
    });
  });
});
