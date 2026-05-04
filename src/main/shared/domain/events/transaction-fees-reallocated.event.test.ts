import { TransactionFeesReallocatedEvent } from './transaction-fees-reallocated.event';

describe('TransactionFeesReallocatedEvent', () => {
  it('stores ticker, year and occurredOn', () => {
    const occurredOn = new Date('2025-04-01T10:00:00.000Z');

    const event = new TransactionFeesReallocatedEvent({
      ticker: 'PETR4',
      year: 2025,
      occurredOn,
    });

    expect(event.name).toBe(TransactionFeesReallocatedEvent.name);
    expect(event.ticker).toBe('PETR4');
    expect(event.year).toBe(2025);
    expect(event.occurredOn).toBe(occurredOn);
  });
});
