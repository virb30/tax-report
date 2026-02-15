import { Cnpj } from "../shared/cnpj.vo";
import { Uuid } from "../shared/uuid.vo";

type BrokerProps = {
  id: Uuid;
  name: string;
  cnpj: Cnpj;
  code: string;
  active?: boolean;
};

type RestoreBrokerProps = BrokerProps;

type CreateBrokerProps = Omit<BrokerProps, 'id'>;


export class Broker {
  private readonly _id: Uuid;
  private _name: string;
  private _cnpj: Cnpj;
  private _code: string;
  private _active: boolean;

  private constructor(props: BrokerProps) {
    this._id = props.id;
    this._name = props.name.trim();
    this._cnpj = props.cnpj;
    this._code = props.code.trim().toUpperCase();
    this._active = props.active ?? true;
    this.validate();
  }

  static restore(props: RestoreBrokerProps): Broker {
    return new Broker({
      id: props.id,
      name: props.name,
      cnpj: props.cnpj,
      code: props.code,
      active: props.active,
    });
  }

  static create(props: CreateBrokerProps): Broker {
    return new Broker({
      id: Uuid.create(),
      name: props.name,
      cnpj: props.cnpj,
      code: props.code,
      active: true,
    });
  }

  get id(): Uuid {
    return this._id;
  }

  private validate(): void {
    if (this.name.length === 0) {
      throw new Error('Nome da corretora e obrigatorio.');
    }
    if (this.code.length === 0) {
      throw new Error('Código da corretora e obrigatorio.');
    }
  }

  activate(): void {
    this._active = true;
  }

  deactivate(): void {
    this._active = false;
  }

  isActive(): boolean {
    return this._active;
  }

  changeName(name: string): void {
    this._name = name.trim();
    this.validate();
  }

  changeCode(code: string): void {
    this._code = code.trim().toUpperCase();
    this.validate();
  }

  changeCnpj(cnpj: Cnpj): void {
    this._cnpj = cnpj;
    this.validate();
  }

  get name(): string {
    return this._name;
  }

  get cnpj(): Cnpj {
    return this._cnpj;
  }

  get code(): string {
    return this._code;
  }
}

