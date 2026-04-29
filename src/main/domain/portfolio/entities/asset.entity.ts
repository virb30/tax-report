import type { AssetType, AssetTypeSource } from '../../../../shared/types/domain';
import type { Cnpj } from '../../shared/cnpj.vo';

type AssetProps = {
  ticker: string;
  issuerCnpj?: Cnpj;
  name?: string;
  assetType?: AssetType;
  resolutionSource?: AssetTypeSource;
};

export class Asset {
  private constructor(
    public readonly ticker: string,
    private _issuerCnpj?: Cnpj,
    private _name?: string,
    private _assetType?: AssetType,
    private _resolutionSource?: AssetTypeSource,
  ) {}

  static create(props: AssetProps): Asset {
    return new Asset(
      props.ticker,
      props.issuerCnpj,
      props.name,
      props.assetType,
      props.resolutionSource,
    );
  }

  get issuerCnpj(): string | null {
    return this._issuerCnpj?.value ?? null;
  }

  get name(): string | null {
    return this._name ?? null;
  }

  get assetType(): AssetType | null {
    return this._assetType ?? null;
  }

  get resolutionSource(): AssetTypeSource | null {
    return this._resolutionSource ?? null;
  }

  changeName(name: string): void {
    this._name = name;
  }

  changeIssuerCnpj(cnpj: Cnpj): void {
    this._issuerCnpj = cnpj;
  }

  changeAssetType(assetType: AssetType, resolutionSource: AssetTypeSource): void {
    this._assetType = assetType;
    this._resolutionSource = resolutionSource;
  }
}
