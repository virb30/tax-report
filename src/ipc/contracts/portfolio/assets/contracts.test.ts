import { AssetType } from '../../domain';
import {
  listAssetsContract,
  listAssetsSchema,
  repairAssetTypeSchema,
  updateAssetSchema,
} from './contracts';

describe('portfolio asset contracts', () => {
  it('preserves list assets channel metadata', () => {
    expect(listAssetsContract).toMatchObject({
      id: 'assets.list',
      channel: 'assets:list',
      errorMode: 'throw',
      exposeToRenderer: true,
      api: { name: 'listAssets' },
    });
  });

  it('validates optional list assets filters', () => {
    expect(listAssetsSchema.parse(undefined)).toBeUndefined();
    expect(listAssetsSchema.parse({ pendingOnly: true })).toEqual({ pendingOnly: true });
  });

  it('requires at least one update asset field', () => {
    expect(
      updateAssetSchema.parse({
        ticker: ' IVVB11 ',
        assetType: AssetType.Etf,
      }),
    ).toEqual({
      ticker: 'IVVB11',
      assetType: AssetType.Etf,
    });
    expect(() => updateAssetSchema.parse({ ticker: 'IVVB11' })).toThrow();
  });

  it('validates repair asset type payloads', () => {
    expect(repairAssetTypeSchema.parse({ ticker: ' IVVB11 ', assetType: AssetType.Etf })).toEqual({
      ticker: 'IVVB11',
      assetType: AssetType.Etf,
    });
    expect(() => repairAssetTypeSchema.parse({ ticker: 'IVVB11', assetType: 'crypto' })).toThrow();
  });
});
