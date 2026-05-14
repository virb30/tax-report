import { AssetType } from '../../../shared/types/domain';

export type MonthlyTaxAssetClass = 'stock' | 'unit' | 'fii' | 'etf' | 'unsupported';

export type MonthlyTaxAssetClassReason =
  | 'stock'
  | 'stock_unit_ticker'
  | 'fii'
  | 'etf'
  | 'missing_asset_type'
  | 'unsupported_asset_type';

export interface MonthlyTaxAssetInput {
  ticker: string;
  assetType: AssetType | null;
}

export interface MonthlyTaxAssetClassResolution {
  ticker: string;
  assetClass: MonthlyTaxAssetClass;
  reason: MonthlyTaxAssetClassReason;
  isSupported: boolean;
}

export class MonthlyTaxAssetClassResolverService {
  resolve(input: MonthlyTaxAssetInput): MonthlyTaxAssetClassResolution {
    if (!input.assetType) {
      return this.unsupported(input.ticker, 'missing_asset_type');
    }

    switch (input.assetType) {
      case AssetType.Stock:
        return this.resolveStock(input.ticker);
      case AssetType.Fii:
        return this.supported(input.ticker, 'fii', 'fii');
      case AssetType.Etf:
        return this.supported(input.ticker, 'etf', 'etf');
      default:
        return this.unsupported(input.ticker, 'unsupported_asset_type');
    }
  }

  private resolveStock(ticker: string): MonthlyTaxAssetClassResolution {
    if (ticker.trim().toUpperCase().endsWith('11')) {
      return this.supported(ticker, 'unit', 'stock_unit_ticker');
    }

    return this.supported(ticker, 'stock', 'stock');
  }

  private supported(
    ticker: string,
    assetClass: Exclude<MonthlyTaxAssetClass, 'unsupported'>,
    reason: MonthlyTaxAssetClassReason,
  ): MonthlyTaxAssetClassResolution {
    return {
      ticker,
      assetClass,
      reason,
      isSupported: true,
    };
  }

  private unsupported(
    ticker: string,
    reason: Extract<MonthlyTaxAssetClassReason, 'missing_asset_type' | 'unsupported_asset_type'>,
  ): MonthlyTaxAssetClassResolution {
    return {
      ticker,
      assetClass: 'unsupported',
      reason,
      isSupported: false,
    };
  }
}
