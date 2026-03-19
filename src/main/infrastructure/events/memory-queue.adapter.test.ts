import { describe, expect, it, jest } from '@jest/globals';
import { MemoryQueueAdapter } from './memory-queue.adapter';
import { DomainEvent } from '@main/domain/events/domain-event.interface';

class SomeEvent implements DomainEvent {
  public readonly name = SomeEvent.name;
  public readonly ticker: string;
  public readonly year: number;
  public readonly occurredOn: Date;

  constructor(input: { ticker: string; year: number; occurredOn?: Date }) {
    this.ticker = input.ticker;
    this.year = input.year;
    this.occurredOn = input.occurredOn ?? new Date();
  }
}

describe('MemoryQueueAdapter', () => {

  it('executes all handlers registered for the same event', async () => {
    const queue = new MemoryQueueAdapter();
    const firstHandler = jest.fn<(event: DomainEvent) => Promise<void>>().mockResolvedValue(undefined);
    const secondHandler = jest.fn<(event: DomainEvent) => Promise<void>>().mockResolvedValue(undefined);
    const payload = { ticker: 'PETR4', year: 2025 };
    const event = new SomeEvent(payload);

    queue.subscribe('SomeEvent', firstHandler);
    queue.subscribe('SomeEvent', secondHandler);

    await queue.publish(event);

    expect(firstHandler).toHaveBeenCalledWith(event);
    expect(secondHandler).toHaveBeenCalledWith(event);
  });

  it('does nothing when event has no handlers', async () => {
    const queue = new MemoryQueueAdapter();
    const event = new SomeEvent({ ticker: 'PETR4', year: 2025 });

    await expect(queue.publish(event)).resolves.toBeUndefined();
  });
});
