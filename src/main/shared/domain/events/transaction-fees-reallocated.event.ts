import type { DomainEvent } from './domain-event.interface';

type TransactionFeesReallocatedEventInput = {
  ticker: string;
  year: number;
  occurredOn?: Date;
};

export class TransactionFeesReallocatedEvent implements DomainEvent {
  public readonly name = TransactionFeesReallocatedEvent.name;
  public readonly ticker: string;
  public readonly year: number;
  public readonly occurredOn: Date;

  constructor(input: TransactionFeesReallocatedEventInput) {
    this.ticker = input.ticker;
    this.year = input.year;
    this.occurredOn = input.occurredOn ?? new Date();
  }
}
