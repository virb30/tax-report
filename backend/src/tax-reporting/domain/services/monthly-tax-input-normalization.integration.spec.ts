import { DailyBrokerTax } from '../../../ingestion/domain/entities/daily-broker-tax.entity';
import { Asset } from '../../../portfolio/domain/entities/asset.entity';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { AssetType } from '../../../shared/types/domain';
import { MonthlyTaxAssetClassResolverService } from './monthly-tax-asset-class-resolver.service';
import { MonthlyTaxIrrfAllocatorService } from './monthly-tax-irrf-allocator.service';

describe('monthly tax input normalization services', () => {
  it('consume repository-shaped asset and daily tax outputs without adapter-specific assumptions', () => {
    const brokerId = Uuid.create();
    const assets = [
      Asset.create({
        ticker: 'ALUP11',
        assetType: AssetType.Stock,
      }),
      Asset.create({
        ticker: 'AAPL34',
        assetType: AssetType.Bdr,
      }),
    ];
    const dailyBrokerTaxes = [
      DailyBrokerTax.create({
        date: '2026-02-10',
        brokerId,
        fees: Money.from('1.25'),
        irrf: Money.from('0.20'),
      }),
    ];

    const assetClassResolver = new MonthlyTaxAssetClassResolverService();
    const irrfAllocator = new MonthlyTaxIrrfAllocatorService();
    const assetClassesByTicker = new Map(
      assets.map((asset) => [
        asset.ticker,
        assetClassResolver.resolve({
          ticker: asset.ticker,
          assetType: asset.assetType,
        }).assetClass,
      ]),
    );

    const result = irrfAllocator.allocate({
      sales: [
        {
          id: 'sale-1',
          date: '2026-02-10',
          brokerId: brokerId.value,
          ticker: 'ALUP11',
          assetClass: assetClassesByTicker.get('ALUP11') ?? 'unsupported',
          grossAmount: Money.from('1000.00'),
        },
        {
          id: 'sale-2',
          date: '2026-02-10',
          brokerId: brokerId.value,
          ticker: 'AAPL34',
          assetClass: assetClassesByTicker.get('AAPL34') ?? 'unsupported',
          grossAmount: Money.from('1000.00'),
        },
      ],
      dailyBrokerTaxes,
    });

    expect(assetClassesByTicker.get('ALUP11')).toBe('unit');
    expect(assetClassesByTicker.get('AAPL34')).toBe('unsupported');
    expect(result.missingInputs).toEqual([]);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0]).toMatchObject({
      saleOperationId: 'sale-1',
      ticker: 'ALUP11',
      assetClass: 'unit',
    });
    expect(result.allocations[0].allocatedIrrf.getAmount()).toBe('0.2');
  });
});
