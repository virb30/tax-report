import { DailyBrokerTax } from '../../../ingestion/domain/entities/daily-broker-tax.entity';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import {
  MonthlyTaxIrrfAllocatorService,
  type MonthlyTaxSaleOperationInput,
} from './monthly-tax-irrf-allocator.service';

function createDailyBrokerTax(input: {
  date: string;
  brokerId: Uuid;
  irrf: string;
}): DailyBrokerTax {
  return DailyBrokerTax.create({
    date: input.date,
    brokerId: input.brokerId,
    fees: Money.from(0),
    irrf: Money.from(input.irrf),
  });
}

function createSale(input: Partial<MonthlyTaxSaleOperationInput>): MonthlyTaxSaleOperationInput {
  return {
    id: input.id ?? 'sale-1',
    date: input.date ?? '2026-01-15',
    brokerId: input.brokerId ?? Uuid.create().value,
    ticker: input.ticker ?? 'PETR4',
    assetClass: input.assetClass ?? 'stock',
    grossAmount: input.grossAmount ?? Money.from(100),
  };
}

describe('MonthlyTaxIrrfAllocatorService', () => {
  const service = new MonthlyTaxIrrfAllocatorService();

  it('distributes a stored daily IRRF amount across supported same-day sale operations', () => {
    const brokerId = Uuid.create();

    const result = service.allocate({
      sales: [
        createSale({
          id: 'sale-1',
          brokerId: brokerId.value,
          ticker: 'PETR4',
          grossAmount: Money.from(100),
        }),
        createSale({
          id: 'sale-2',
          brokerId: brokerId.value,
          ticker: 'VALE3',
          grossAmount: Money.from(300),
        }),
      ],
      dailyBrokerTaxes: [
        createDailyBrokerTax({
          date: '2026-01-15',
          brokerId,
          irrf: '0.10',
        }),
      ],
    });

    expect(result.missingInputs).toEqual([]);
    expect(
      result.allocations.map((allocation) => ({
        saleOperationId: allocation.saleOperationId,
        allocatedIrrf: allocation.allocatedIrrf.getAmount(),
      })),
    ).toEqual([
      {
        saleOperationId: 'sale-1',
        allocatedIrrf: '0.025',
      },
      {
        saleOperationId: 'sale-2',
        allocatedIrrf: '0.075',
      },
    ]);
  });

  it('allocates only supported sale operations when unsupported assets share the date', () => {
    const brokerId = Uuid.create();

    const result = service.allocate({
      sales: [
        createSale({
          id: 'supported-sale',
          brokerId: brokerId.value,
          ticker: 'BOVA11',
          assetClass: 'etf',
          grossAmount: Money.from(100),
        }),
        createSale({
          id: 'unsupported-sale',
          brokerId: brokerId.value,
          ticker: 'AAPL34',
          assetClass: 'unsupported',
          grossAmount: Money.from(900),
        }),
      ],
      dailyBrokerTaxes: [
        createDailyBrokerTax({
          date: '2026-01-15',
          brokerId,
          irrf: '0.50',
        }),
      ],
    });

    expect(result.missingInputs).toEqual([]);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0]).toMatchObject({
      saleOperationId: 'supported-sale',
      ticker: 'BOVA11',
      assetClass: 'etf',
    });
    expect(result.allocations[0].allocatedIrrf.getAmount()).toBe('0.5');
  });

  it('marks a required daily broker tax row as missing when a supported sale cannot be allocated', () => {
    const brokerId = Uuid.create();

    const result = service.allocate({
      sales: [
        createSale({
          id: 'sale-1',
          brokerId: brokerId.value,
        }),
      ],
      dailyBrokerTaxes: [],
    });

    expect(result.allocations).toEqual([]);
    expect(result.missingInputs).toEqual([
      {
        date: '2026-01-15',
        brokerId: brokerId.value,
        saleOperationIds: ['sale-1'],
        reason: 'missing_daily_broker_tax',
      },
    ]);
  });

  it('blocks allocation when supported sale totals are not positive', () => {
    const brokerId = Uuid.create();

    const result = service.allocate({
      sales: [
        createSale({
          id: 'sale-1',
          brokerId: brokerId.value,
          grossAmount: Money.from(0),
        }),
      ],
      dailyBrokerTaxes: [
        createDailyBrokerTax({
          date: '2026-01-15',
          brokerId,
          irrf: '0.10',
        }),
      ],
    });

    expect(result.allocations).toEqual([]);
    expect(result.missingInputs).toEqual([
      {
        date: '2026-01-15',
        brokerId: brokerId.value,
        saleOperationIds: ['sale-1'],
        reason: 'non_positive_supported_sale_total',
      },
    ]);
  });
});
