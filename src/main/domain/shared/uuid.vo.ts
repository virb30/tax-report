import { v7 as uuidv7, validate as validateUuid, version as uuidVersion} from 'uuid';

const UUID_VERSION = 7;

export class Uuid {
  private constructor(public readonly value: string) {
    this.validate(value);
  }

  static from(value: string): Uuid {
    return new Uuid(value);
  }

  static create(): Uuid {
    return new Uuid(uuidv7());
  }

  private validate(value: string): void {
    if (!validateUuid(value)) {
      throw new Error(`Invalid UUID: ${value}`);
    }
    if (uuidVersion(value) !== UUID_VERSION) {
      throw new Error(`Invalid UUID version: ${value}`);
    }
  }
}