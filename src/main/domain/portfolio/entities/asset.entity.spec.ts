import { AssetType, AssetTypeSource } from '../../../../shared/types/domain';
import { Cnpj } from '../../shared/cnpj.vo';
import { Asset } from './asset.entity';

describe('AssetEntity', () => {
  it('creates a new asset', () => {
    const asset = Asset.create({
      ticker: 'PETR4',
      issuerCnpj: new Cnpj('12345678901214'),
      name: 'Petrobras',
      assetType: AssetType.Stock,
      resolutionSource: AssetTypeSource.File,
    });

    expect(asset.ticker).toBe('PETR4');
    expect(asset.issuerCnpj).toBe('12.345.678/9012-14');
    expect(asset.name).toBe('Petrobras');
    expect(asset.assetType).toBe(AssetType.Stock);
    expect(asset.resolutionSource).toBe(AssetTypeSource.File);
  });

  it('exposes nullable issuer metadata without placeholder values', () => {
    const asset = Asset.create({
      ticker: 'HGLG11',
    });

    expect(asset.issuerCnpj).toBeNull();
    expect(asset.name).toBeNull();
    expect(asset.assetType).toBeNull();
    expect(asset.resolutionSource).toBeNull();
  });

  it('changes the name', () => {
    const asset = Asset.create({
      ticker: 'PETR4',
      issuerCnpj: new Cnpj('12345678901214'),
      name: 'Petrobras',
    });
    asset.changeName('Petrobras S.A.');
    expect(asset.name).toBe('Petrobras S.A.');
  });

  it('changes the issuer cnpj', () => {
    const asset = Asset.create({
      ticker: 'PETR4',
      issuerCnpj: new Cnpj('12345678901214'),
      name: 'Petrobras',
    });
    asset.changeIssuerCnpj(new Cnpj('12345678901215'));
    expect(asset.issuerCnpj).toBe('12.345.678/9012-15');
  });

  it('changes the canonical asset type and provenance together', () => {
    const asset = Asset.create({
      ticker: 'IVVB11',
    });

    asset.changeAssetType(AssetType.Etf, AssetTypeSource.Manual);

    expect(asset.assetType).toBe(AssetType.Etf);
    expect(asset.resolutionSource).toBe(AssetTypeSource.Manual);
  });
});
