import type { Cnpj } from '../../shared/cnpj.vo';

type AssetProps = {
  ticker: string;
  issuerCnpj?: Cnpj;
  name?: string;
};

export class Asset {
  private constructor(
    public readonly ticker: string,
    private _issuerCnpj?: Cnpj,
    private _name?: string,
  ) {}

  static create(props: AssetProps): Asset {
    return new Asset(props.ticker, props.issuerCnpj, props.name);
  }

  get issuerCnpj(): string {
    return this._issuerCnpj?.value ?? 'N/A';
  }

  get name(): string | undefined {
    return this._name;
  }

  changeName(name: string): void {
    this._name = name;
  }

  changeIssuerCnpj(cnpj: Cnpj): void {
    this._issuerCnpj = cnpj;
  }
}