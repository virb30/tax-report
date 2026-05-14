import type { DomainEvent } from '../../domain/events/domain-event.interface';

export type EventHandler = (event: DomainEvent) => Promise<void>;

export interface Queue {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventName: string, handler: unknown): void;
}
