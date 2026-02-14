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
  readonly name: string;
  readonly cnpj: Cnpj;
  readonly code: string;
  private _active: boolean;

  private constructor(props: BrokerProps) {
    this._id = props.id;
    this.name = props.name.trim();
    this.cnpj = props.cnpj;
    this.code = props.code.trim();
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

  get id(): string {
    return this._id.value;
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

  get active(): boolean {
    return this._active;
  }
}

