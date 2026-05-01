import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { PositionBrokerAllocation } from './position-broker-allocation';
import { Quantity } from '../value-objects/quantity.vo';

describe('PositionBrokerAllocation', () => {
  it('increments and exports allocations', () => {
    const brokerId = Uuid.create();
    const allocation = new PositionBrokerAllocation([{ brokerId, quantity: Quantity.from(10) }]);

    allocation.increment(brokerId, Quantity.from(5));

    expect(allocation.total().getAmount()).toBe(Quantity.from(15).getAmount());
    expect(allocation.toArray()).toEqual([{ brokerId, quantity: Quantity.from(15) }]);
  });

  it('decrements and removes broker when quantity reaches zero', () => {
    const brokerId = Uuid.create();
    const allocation = new PositionBrokerAllocation([{ brokerId, quantity: Quantity.from(10) }]);

    allocation.decrement(brokerId, Quantity.from(10));

    expect(allocation.total().getAmount()).toBe(Quantity.from(0).getAmount());
    expect(allocation.toArray()).toEqual([]);
  });

  it('throws when decrementing more than allocated', () => {
    const brokerId = Uuid.create();
    const allocation = new PositionBrokerAllocation([{ brokerId, quantity: Quantity.from(10) }]);

    expect(() => allocation.decrement(brokerId, Quantity.from(11))).toThrow(
      'Cannot sell more than current quantity allocated to this broker.',
    );
  });

  it('applies ratio with floor and removes zeroed allocations', () => {
    const brokerId1 = Uuid.create();
    const brokerId2 = Uuid.create();
    const allocation = new PositionBrokerAllocation([
      { brokerId: brokerId1, quantity: Quantity.from(5) },
      { brokerId: brokerId2, quantity: Quantity.from(1) },
    ]);

    // B3 rule: floor for splits/reverse splits
    allocation.applyRatio((quantity) => quantity.divideBy(2).floor());

    expect(allocation.total().getAmount()).toBe(Quantity.from(2).getAmount());
    expect(allocation.toArray()).toEqual([{ brokerId: brokerId1, quantity: Quantity.from(2) }]);
  });
});
