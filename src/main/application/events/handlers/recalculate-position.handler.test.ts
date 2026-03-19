import { describe, expect, it, jest } from '@jest/globals';
import type { Queue } from '../queue.interface';
import type { RecalculatePositionUseCase } from '../../use-cases/recalculate-position/recalculate-position.use-case';
import { RecalculatePositionHandler } from './recalculate-position.handler';
import { ConsolidatedPositionImportedEvent } from '../../../domain/events/consolidated-position-imported.event';
import { TransactionsImportedEvent } from '../../../domain/events/transactions-imported.event';
import { mock, mockReset } from 'jest-mock-extended';
import { MemoryQueueAdapter } from '@main/infrastructure/events/memory-queue.adapter';

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
  });

  it('executes recalculate use case when receiving both events', async () => {
    const queue = new MemoryQueueAdapter();
    recalculatePositionUseCase.execute.mockResolvedValue({ totalQuantity: 10, averagePrice: 20 } as never);
    new RecalculatePositionHandler(queue, recalculatePositionUseCase);
    
    await queue.publish(new ConsolidatedPositionImportedEvent({ ticker: 'PETR4', year: 2025 }));
    await queue.publish(new TransactionsImportedEvent({ ticker: 'VALE3', year: 2024 }));

    expect(recalculatePositionUseCase.execute).toHaveBeenCalledWith({ ticker: 'PETR4', year: 2025 });
    expect(recalculatePositionUseCase.execute).toHaveBeenCalledWith({ ticker: 'VALE3', year: 2024 });
  });
});
