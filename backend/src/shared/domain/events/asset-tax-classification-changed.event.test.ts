import { AssetTaxClassificationChangedEvent } from './asset-tax-classification-changed.event';

describe('AssetTaxClassificationChangedEvent', () => {
  it('stores ticker, earliest year and occurredOn', () => {
    const occurredOn = new Date('2026-05-07T10:00:00.000Z');

    const event = new AssetTaxClassificationChangedEvent({
      ticker: 'PETR4',
      earliestYear: 2024,
      occurredOn,
    });

    expect(event.name).toBe(AssetTaxClassificationChangedEvent.name);
    expect(event.ticker).toBe('PETR4');
    expect(event.earliestYear).toBe(2024);
    expect(event.occurredOn).toBe(occurredOn);
  });
});
