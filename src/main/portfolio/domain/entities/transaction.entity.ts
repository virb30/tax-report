import { type SourceType, TransactionType } from '../../../shared/types/domain';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import type { Money } from '../value-objects/money.vo';
import type { Quantity } from '../value-objects/quantity.vo';

interface TransactionProps {
  id: Uuid;
  date: string;
  type: TransactionType;
  ticker: string;
  quantity: Quantity;
  unitPrice: Money;
  fees: Money;
  brokerId: Uuid;
  sourceType: SourceType;
  externalRef?: string;
  importBatchId?: string;
}

type CreateTransactionProps = Omit<TransactionProps, 'id'>;
type RestoreTransactionProps = TransactionProps;

export class Transaction {
  readonly id: Uuid;
  readonly date: string;
  readonly type: TransactionType;
  readonly ticker: string;
  private readonly _quantity: Quantity;
  private readonly _unitPrice: Money;
  private readonly _fees: Money;
  readonly brokerId: Uuid;
  readonly sourceType: SourceType;
  readonly externalRef?: string;
  readonly importBatchId?: string;

  private constructor(props: TransactionProps) {
    this.id = props.id;
    this.date = props.date;
    this.type = props.type;
    this.ticker = props.ticker;
    this._quantity = props.quantity;
    this._unitPrice = props.unitPrice;
    this._fees = props.fees;
    this.brokerId = props.brokerId;
    this.sourceType = props.sourceType;
    this.externalRef = props.externalRef;
    this.importBatchId = props.importBatchId;
  }

  static create(props: CreateTransactionProps): Transaction {
    return new Transaction({
      id: Uuid.create(),
      date: props.date,
      type: props.type,
      ticker: props.ticker,
      quantity: props.quantity,
      unitPrice: props.unitPrice,
      fees: props.fees,
      brokerId: props.brokerId,
      sourceType: props.sourceType,
      externalRef: props.externalRef,
      importBatchId: props.importBatchId,
    });
  }

  static restore(props: RestoreTransactionProps): Transaction {
    return new Transaction({
      id: props.id,
      date: props.date,
      type: props.type,
      ticker: props.ticker,
      quantity: props.quantity,
      unitPrice: props.unitPrice,
      fees: props.fees,
      brokerId: props.brokerId,
      sourceType: props.sourceType,
      externalRef: props.externalRef,
      importBatchId: props.importBatchId,
    });
  }

  isInitialBalance(): boolean {
    return this.type === TransactionType.InitialBalance;
  }

  get quantity(): Quantity {
    return this._quantity;
  }

  get unitPrice(): Money {
    return this._unitPrice;
  }

  get fees(): Money {
    return this._fees;
  }

  get quantityAmount(): string {
    return this._quantity.getAmount();
  }

  get unitPriceAmount(): string {
    return this._unitPrice.getAmount();
  }

  get feesAmount(): string {
    return this._fees.getAmount();
  }
}
