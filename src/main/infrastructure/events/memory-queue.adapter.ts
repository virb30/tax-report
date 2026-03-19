import { DomainEvent } from '@main/domain/events/domain-event.interface';
import type { EventHandler, Queue } from '../../application/events/queue.interface';

export class MemoryQueueAdapter implements Queue {
  readonly consumers = new Map<string, EventHandler[]>();

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.consumers.get(event.name) ?? [];
    for (const handler of handlers) {
      await handler(event);
    }
  }

  subscribe(eventName: string, handler: EventHandler): void {
    const handlers = this.consumers.get(eventName) ?? [];
    handlers.push(handler);
    this.consumers.set(eventName, handlers);
  }
}
