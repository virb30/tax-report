import type { DomainEvent } from '../../domain/events/domain-event.interface';
import type { Queue } from './queue.interface';

export class RecordingMemoryQueueAdapter implements Queue {
  readonly subscriptions: Array<{ eventName: string; handler: unknown }> = [];
  readonly publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
  }

  subscribe(eventName: string, handler: unknown): void {
    this.subscriptions.push({ eventName, handler });
  }
}
