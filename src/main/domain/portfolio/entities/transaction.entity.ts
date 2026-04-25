import { type SourceType, TransactionType } from '../../../../shared/types/domain';
import { Uuid } from '../../shared/uuid.vo';

interface TransactionProps {
  id: Uuid;
  date: string;
  type: TransactionType;
  ticker: string;
  quantity: number;
  unitPrice: number;
  fees: number;
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
  readonly quantity: number;
  readonly unitPrice: number;
  readonly fees: number;
  readonly brokerId: Uuid;
  readonly sourceType: SourceType;
  readonly externalRef?: string;
  readonly importBatchId?: string;

  private constructor(props: TransactionProps) {
    this.id = props.id;
    this.date = props.date;
    this.type = props.type;
    this.ticker = props.ticker;
    this.quantity = props.quantity;
    this.unitPrice = props.unitPrice;
    this.fees = props.fees;
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
}