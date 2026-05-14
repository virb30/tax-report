export class Cnpj {
  private readonly _value: string;
  constructor(value: string) {
    this._value = value.replace(/\D/g, '');
    this.validate();
  }

  private validate(): void {
    if (this._value.length !== 14) {
      throw new Error('CNPJ inválido.');
    }
  }

  get value(): string {
    return `${this._value.slice(0, 2)}.${this._value.slice(2, 5)}.${this._value.slice(5, 8)}/${this._value.slice(8, 12)}-${this._value.slice(12)}`;
  }

  get rawValue(): string {
    return this._value;
  }
}
