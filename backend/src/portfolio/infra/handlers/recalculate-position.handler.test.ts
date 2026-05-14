import type { RecalculatePositionUseCase } from '../../application/use-cases/recalculate-position.use-case';
import { RecalculatePositionHandler } from './recalculate-position.handler';
import { ConsolidatedPositionImportedEvent } from '../../../shared/domain/events/consolidated-position-imported.event';
import { TransactionFeesReallocatedEvent } from '../../../shared/domain/events/transaction-fees-reallocated.event';
import { TransactionsImportedEvent } from '../../../shared/domain/events/transactions-imported.event';
import { mock, mockReset } from 'jest-mock-extended';
import { MemoryQueueAdapter } from '../../../shared/infra/events/memory-queue.adapter';

describe('RecalculatePositionHandler', () => {
  const recalculatePositionUseCase = mock<RecalculatePositionUseCase>();

  beforeEach(() => {
    mockReset(recalculatePositionUseCase);
  });
  it('subscribes to consolidated and transactions imported events in constructor', () => {
    const queue = new MemoryQueueAdapter();

    new RecalculatePositionHandler(queue, recalculatePositionUseCase);

    expect(queue.consumers.get(ConsolidatedPositionImportedEvent.name)).toBeDefined();
    expect(queue.consumers.get(TransactionsImportedEvent.name)).toBeDefined();
    expect(queue.consumers.get(TransactionFeesReallocatedEvent.name)).toBeDefined();
  });

  it('executes recalculate use case when receiving both events', async () => {
    const queue = new MemoryQueueAdapter();
    recalculatePositionUseCase.execute.mockResolvedValue({
      totalQuantity: 10,
      averagePrice: 20,
    } as never);
    new RecalculatePositionHandler(queue, recalculatePositionUseCase);

    await queue.publish(new ConsolidatedPositionImportedEvent({ ticker: 'PETR4', year: 2025 }));
    await queue.publish(new TransactionsImportedEvent({ ticker: 'VALE3', year: 2024 }));
    await queue.publish(new TransactionFeesReallocatedEvent({ ticker: 'ITUB4', year: 2023 }));

    expect(recalculatePositionUseCase.execute).toHaveBeenCalledWith({
      ticker: 'PETR4',
      year: 2025,
    });
    expect(recalculatePositionUseCase.execute).toHaveBeenCalledWith({
      ticker: 'VALE3',
      year: 2024,
    });
    expect(recalculatePositionUseCase.execute).toHaveBeenCalledWith({
      ticker: 'ITUB4',
      year: 2023,
    });
  });
});
