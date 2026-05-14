import type { DomainEvent } from './domain-event.interface';

type ConsolidatedPositionImportedEventInput = {
  ticker: string;
  year: number;
  occurredOn?: Date;
};

export class ConsolidatedPositionImportedEvent implements DomainEvent {
  public readonly name = ConsolidatedPositionImportedEvent.name;
  public readonly ticker: string;
  public readonly year: number;
  public readonly occurredOn: Date;

  constructor(input: ConsolidatedPositionImportedEventInput) {
    this.ticker = input.ticker;
    this.year = input.year;
    this.occurredOn = input.occurredOn ?? new Date();
  }
}
