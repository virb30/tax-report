import type { DomainEvent } from './domain-event.interface';

type AssetTaxClassificationChangedEventInput = {
  ticker: string;
  earliestYear: number;
  occurredOn?: Date;
};

export class AssetTaxClassificationChangedEvent implements DomainEvent {
  public readonly name = AssetTaxClassificationChangedEvent.name;
  public readonly ticker: string;
  public readonly earliestYear: number;
  public readonly occurredOn: Date;

  constructor(input: AssetTaxClassificationChangedEventInput) {
    this.ticker = input.ticker;
    this.earliestYear = input.earliestYear;
    this.occurredOn = input.occurredOn ?? new Date();
  }
}
