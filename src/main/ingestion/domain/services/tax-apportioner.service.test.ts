import { TaxApportioner } from './tax-apportioner.service';

describe('TaxApportioner', () => {
  const service = new TaxApportioner();

  it('allocates costs proportionally and preserves note total', () => {
    const allocations = service.allocate({
      totalOperationalCosts: 1,
      operations: [
        { ticker: 'PETR4', quantity: 1, unitPrice: 10 },
        { ticker: 'VALE3', quantity: 2, unitPrice: 10 },
      ],
    });

    expect(allocations).toEqual([0.33, 0.67]);
    expect(allocations.reduce((sum, current) => sum + current, 0)).toBeCloseTo(1, 2);
  });

  it('keeps deterministic tie-breaker when distributing remaining cents', () => {
    const allocations = service.allocate({
      totalOperationalCosts: 0.01,
      operations: [
        { ticker: 'PETR4', quantity: 1, unitPrice: 10 },
        { ticker: 'VALE3', quantity: 1, unitPrice: 10 },
        { ticker: 'ITUB4', quantity: 1, unitPrice: 10 },
      ],
    });

    expect(allocations).toEqual([0.01, 0, 0]);
  });

  it('returns the full cost for single operation note', () => {
    const allocations = service.allocate({
      totalOperationalCosts: 2.53,
      operations: [{ ticker: 'PETR4', quantity: 10, unitPrice: 20 }],
    });

    expect(allocations).toEqual([2.53]);
  });

  it('returns zero allocations when note cost is zero', () => {
    const allocations = service.allocate({
      totalOperationalCosts: 0,
      operations: [
        { ticker: 'PETR4', quantity: 10, unitPrice: 20 },
        { ticker: 'VALE3', quantity: 5, unitPrice: 40 },
      ],
    });

    expect(allocations).toEqual([0, 0]);
  });

  it('falls back to deterministic even split when all operation weights are zero', () => {
    const allocations = service.allocate({
      totalOperationalCosts: 0.05,
      operations: [
        { ticker: 'PETR4', quantity: 1, unitPrice: 0 },
        { ticker: 'VALE3', quantity: 1, unitPrice: 0 },
      ],
    });

    expect(allocations).toEqual([0.03, 0.02]);
    expect(allocations.reduce((sum, current) => sum + current, 0)).toBeCloseTo(0.05, 2);
  });

  it('throws for non-finite total operational costs', () => {
    expect(() =>
      service.allocate({
        totalOperationalCosts: Number.POSITIVE_INFINITY,
        operations: [{ ticker: 'PETR4', quantity: 1, unitPrice: 10 }],
      }),
    ).toThrow('Total operational costs must be finite.');
  });

  it('throws for negative total operational costs', () => {
    expect(() =>
      service.allocate({
        totalOperationalCosts: -1,
        operations: [{ ticker: 'PETR4', quantity: 1, unitPrice: 10 }],
      }),
    ).toThrow('Total operational costs cannot be negative.');
  });

  it('throws when note does not have operations', () => {
    expect(() =>
      service.allocate({
        totalOperationalCosts: 1,
        operations: [],
      }),
    ).toThrow('At least one operation is required for allocation.');
  });

  it('throws for invalid operation quantity', () => {
    expect(() =>
      service.allocate({
        totalOperationalCosts: 1,
        operations: [{ ticker: 'PETR4', quantity: 0, unitPrice: 10 }],
      }),
    ).toThrow('Operation quantity must be greater than zero.');
  });

  it('throws for negative operation unit price', () => {
    expect(() =>
      service.allocate({
        totalOperationalCosts: 1,
        operations: [{ ticker: 'PETR4', quantity: 1, unitPrice: -10 }],
      }),
    ).toThrow('Operation unit price cannot be negative.');
  });
});
