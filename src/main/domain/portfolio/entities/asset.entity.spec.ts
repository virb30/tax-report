import { Cnpj } from "../../shared/cnpj.vo";
import { Asset } from "./asset.entity";

describe('AssetEntity', () => {
  it('should create a new asset', () => {
    const asset = Asset.create({
      ticker: 'PETR4',
      issuerCnpj: new Cnpj('12345678901214'),
      name: 'Petrobras',
    });

    expect(asset).toBeDefined();
    expect(asset.ticker).toBe('PETR4');
    expect(asset.issuerCnpj).toBe('12.345.678/9012-14');
    expect(asset.name).toBe('Petrobras');
  });

  it('should change the name', () => {
    const asset = Asset.create({
      ticker: 'PETR4',
      issuerCnpj: new Cnpj('12345678901214'),
      name: 'Petrobras',
    });
    asset.changeName('Petrobras S.A.');
    expect(asset.name).toBe('Petrobras S.A.');
  });

  it('should change the issuer cnpj', () => {
    const asset = Asset.create({
      ticker: 'PETR4',
      issuerCnpj: new Cnpj('12345678901214'),
      name: 'Petrobras',
    });
    asset.changeIssuerCnpj(new Cnpj('12345678901215'));
    expect(asset.issuerCnpj).toBe('12.345.678/9012-15');
  });
});