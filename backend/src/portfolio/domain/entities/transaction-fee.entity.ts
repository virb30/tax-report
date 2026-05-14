import type { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import type { Money } from '../value-objects/money.vo';

type TransactionFeeProps = {
  transactionId: Uuid;
  totalFees: Money;
};

export class TransactionFee {
  readonly transactionId: Uuid;
  private readonly _totalFees: Money;

  private constructor(props: TransactionFeeProps) {
    this.transactionId = props.transactionId;
    this._totalFees = props.totalFees;
    this.validate();
  }

  static create(props: TransactionFeeProps): TransactionFee {
    return new TransactionFee(props);
  }

  static restore(props: TransactionFeeProps): TransactionFee {
    return new TransactionFee(props);
  }

  get totalFees(): Money {
    return this._totalFees;
  }

  get totalFeesAmount(): string {
    return this._totalFees.getAmount();
  }

  private validate(): void {
    if (this._totalFees.isNegative()) {
      throw new Error('Transaction fee total cannot be negative.');
    }
  }
}
