import type { DomainEvent } from './domain-event.interface';

type TransactionsImportedEventInput = {
  ticker: string;
  year: number;
  occurredOn?: Date;
};

export class TransactionsImportedEvent implements DomainEvent {
  public readonly name = TransactionsImportedEvent.name;
  public readonly ticker: string;
  public readonly year: number;
  public readonly occurredOn: Date;

  constructor(input: TransactionsImportedEventInput) {
    this.ticker = input.ticker;
    this.year = input.year;
    this.occurredOn = input.occurredOn ?? new Date();
  }
}
