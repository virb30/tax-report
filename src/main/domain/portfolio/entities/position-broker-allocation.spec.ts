
import { Uuid } from '../../shared/uuid.vo';
import { PositionBrokerAllocation } from './position-broker-allocation';

describe('PositionBrokerAllocation', () => {
  it('increments and exports allocations', () => {
    const brokerId = Uuid.create();
    const allocation = new PositionBrokerAllocation([{ brokerId, quantity: 10 }]);

    allocation.increment(brokerId, 5);

    expect(allocation.total()).toBe(15);
    expect(allocation.toArray()).toEqual([{ brokerId, quantity: 15 }]);
  });

  it('decrements and removes broker when quantity reaches zero', () => {
    const brokerId = Uuid.create();
    const allocation = new PositionBrokerAllocation([{ brokerId, quantity: 10 }]);

    allocation.decrement(brokerId, 10);

    expect(allocation.total()).toBe(0);
    expect(allocation.toArray()).toEqual([]);
  });

  it('throws when decrementing more than allocated', () => {
    const brokerId = Uuid.create();
    const allocation = new PositionBrokerAllocation([{ brokerId, quantity: 10 }]);

    expect(() => allocation.decrement(brokerId, 11)).toThrow(
      'Cannot sell more than current quantity allocated to this broker.',
    );
  });

  it('applies ratio with floor and removes zeroed allocations', () => {
    const brokerId1 = Uuid.create();
    const brokerId2 = Uuid.create();
    const allocation = new PositionBrokerAllocation([
      { brokerId: brokerId1, quantity: 5 },
      { brokerId: brokerId2, quantity: 1 },
    ]);

    allocation.applyRatio((quantity) => quantity / 2);

    expect(allocation.total()).toBe(2);
    expect(allocation.toArray()).toEqual([{ brokerId: brokerId1, quantity: 2 }]);
  });
});
