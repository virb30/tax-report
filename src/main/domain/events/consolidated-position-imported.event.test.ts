import { describe, expect, it } from '@jest/globals';
import { ConsolidatedPositionImportedEvent } from './consolidated-position-imported.event';
import type { DomainEvent } from './domain-event.interface';

describe('ConsolidatedPositionImportedEvent', () => {
  it('creates event with required fields', () => {
    const occurredOn = new Date('2026-01-01T00:00:00.000Z');
    const event = new ConsolidatedPositionImportedEvent({
      ticker: 'PETR4',
      year: 2025,
      occurredOn,
    });

    const domainEvent: DomainEvent = event;

    expect(ConsolidatedPositionImportedEvent.name).toBe('ConsolidatedPositionImportedEvent');
    expect(event.ticker).toBe('PETR4');
    expect(event.year).toBe(2025);
    expect(event.occurredOn).toBe(occurredOn);
    expect(domainEvent.occurredOn).toBe(occurredOn);
  });
});
