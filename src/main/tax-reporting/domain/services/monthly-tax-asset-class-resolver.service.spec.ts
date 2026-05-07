import { AssetType } from '../../../shared/types/domain';
import { MonthlyTaxAssetClassResolverService } from './monthly-tax-asset-class-resolver.service';

describe('MonthlyTaxAssetClassResolverService', () => {
  const service = new MonthlyTaxAssetClassResolverService();

  it('classifies stock assets that end in 11 as monthly tax units', () => {
    const result = service.resolve({
      ticker: 'ALUP11',
      assetType: AssetType.Stock,
    });

    expect(result).toEqual({
      ticker: 'ALUP11',
      assetClass: 'unit',
      reason: 'stock_unit_ticker',
      isSupported: true,
    });
  });

  it('keeps stock, FII, and ETF classes supported within monthly tax scope', () => {
    expect(
      service.resolve({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
      }).assetClass,
    ).toBe('stock');
    expect(
      service.resolve({
        ticker: 'HGLG11',
        assetType: AssetType.Fii,
      }).assetClass,
    ).toBe('fii');
    expect(
      service.resolve({
        ticker: 'BOVA11',
        assetType: AssetType.Etf,
      }).assetClass,
    ).toBe('etf');
  });

  it('does not derive FIIs ending in 11 as units', () => {
    const result = service.resolve({
      ticker: 'KNRI11',
      assetType: AssetType.Fii,
    });

    expect(result.assetClass).toBe('fii');
    expect(result.reason).toBe('fii');
  });

  it('returns unsupported when canonical metadata is missing or outside V1 scope', () => {
    expect(
      service.resolve({
        ticker: 'UNKNOWN',
        assetType: null,
      }),
    ).toEqual({
      ticker: 'UNKNOWN',
      assetClass: 'unsupported',
      reason: 'missing_asset_type',
      isSupported: false,
    });
    expect(
      service.resolve({
        ticker: 'AAPL34',
        assetType: AssetType.Bdr,
      }),
    ).toEqual({
      ticker: 'AAPL34',
      assetClass: 'unsupported',
      reason: 'unsupported_asset_type',
      isSupported: false,
    });
  });
});
