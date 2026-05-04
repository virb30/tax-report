import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { Quantity } from '../value-objects/quantity.vo';
import type { BrokerAllocation } from './asset-position.entity';

export class PositionBrokerAllocation {
  private readonly quantities: Map<string, Quantity>;

  constructor(initialAllocations: BrokerAllocation[]) {
    this.quantities = new Map(
      initialAllocations.map((allocation) => [allocation.brokerId.value, allocation.quantity]),
    );
  }

  set(brokerId: Uuid, quantity: Quantity): void {
    this.quantities.set(brokerId.value, quantity);
  }

  replaceWith(brokerId: Uuid, quantity: Quantity): void {
    this.quantities.clear();
    this.set(brokerId, quantity);
  }

  increment(brokerId: Uuid, quantity: Quantity): void {
    const currentBrokerQty = this.quantities.get(brokerId.value) ?? Quantity.from(0);
    this.quantities.set(brokerId.value, currentBrokerQty.add(quantity));
  }

  decrement(brokerId: Uuid, quantity: Quantity): void {
    const brokerQty = this.quantities.get(brokerId.value) ?? Quantity.from(0);

    let newBrokerQty: Quantity;
    try {
      newBrokerQty = brokerQty.subtract(quantity);
    } catch {
      throw new Error('Cannot sell more than current quantity allocated to this broker.');
    }

    if (!newBrokerQty.isZero()) {
      this.quantities.set(brokerId.value, newBrokerQty);
    } else {
      this.quantities.delete(brokerId.value);
    }
  }

  applyRatio(transform: (quantity: Quantity) => Quantity): void {
    for (const [brokerId, quantity] of this.quantities.entries()) {
      const nextBrokerQty = Quantity.from(transform(quantity).getAmount());
      if (!nextBrokerQty.isZero()) {
        this.quantities.set(brokerId, nextBrokerQty);
      } else {
        this.quantities.delete(brokerId);
      }
    }
  }

  total(): Quantity {
    return Array.from(this.quantities.values()).reduce(
      (acc, quantity) => acc.add(quantity),
      Quantity.from(0),
    );
  }

  toArray(): BrokerAllocation[] {
    return Array.from(this.quantities.entries()).map(([brokerId, quantity]) => ({
      brokerId: Uuid.from(brokerId),
      quantity,
    }));
  }
}
