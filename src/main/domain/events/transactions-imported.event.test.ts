import { describe, expect, it } from '@jest/globals';
import { TransactionsImportedEvent } from './transactions-imported.event';

describe('TransactionsImportedEvent', () => {
  it('creates event and defaults occurredOn', () => {
    const beforeCreation = Date.now();
    const event = new TransactionsImportedEvent({
      ticker: 'VALE3',
      year: 2025,
    });
    const afterCreation = Date.now();

    expect(TransactionsImportedEvent.name).toBe('TransactionsImportedEvent');
    expect(event.ticker).toBe('VALE3');
    expect(event.year).toBe(2025);
    expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(beforeCreation);
    expect(event.occurredOn.getTime()).toBeLessThanOrEqual(afterCreation);
  });
});
