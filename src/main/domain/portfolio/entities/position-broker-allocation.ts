import { Uuid } from '../../shared/uuid.vo';
import type { BrokerAllocation } from './asset-position.entity';

export class PositionBrokerAllocation {
  private readonly quantities: Map<string, number>;

  constructor(initialAllocations: BrokerAllocation[]) {
    this.quantities = new Map(
      initialAllocations.map((allocation) => [allocation.brokerId.value, allocation.quantity]),
    );
  }

  set(brokerId: Uuid, quantity: number): void {
    this.quantities.set(brokerId.value, quantity);
  }

  increment(brokerId: Uuid, quantity: number): void {
    const currentBrokerQty = this.quantities.get(brokerId.value) ?? 0;
    this.quantities.set(brokerId.value, currentBrokerQty + quantity);
  }

  decrement(brokerId: Uuid, quantity: number): void {
    const brokerQty = this.quantities.get(brokerId.value) ?? 0;

    if (quantity > brokerQty) {
      throw new Error('Cannot sell more than current quantity allocated to this broker.');
    }

    const newBrokerQty = brokerQty - quantity;
    if (newBrokerQty > 0) {
      this.quantities.set(brokerId.value, newBrokerQty);
    } else {
      this.quantities.delete(brokerId.value);
    }
  }

  applyRatio(transform: (quantity: number) => number): void {
    for (const [brokerId, quantity] of this.quantities.entries()) {
      const nextBrokerQty = Math.floor(transform(quantity));
      if (nextBrokerQty > 0) {
        this.quantities.set(brokerId, nextBrokerQty);
      } else {
        this.quantities.delete(brokerId);
      }
    }
  }

  total(): number {
    return Array.from(this.quantities.values()).reduce((acc, quantity) => acc + quantity, 0);
  }

  toArray(): BrokerAllocation[] {
    return Array.from(this.quantities.entries()).map(([brokerId, quantity]) => ({
      brokerId: Uuid.from(brokerId),
      quantity,
    }));
  }
}
