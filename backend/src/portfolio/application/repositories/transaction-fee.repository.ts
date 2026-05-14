import type { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import type { TransactionFee } from '../../domain/entities/transaction-fee.entity';

export interface TransactionFeeRepository {
  replaceForTransactions(input: { transactionIds: Uuid[]; fees: TransactionFee[] }): Promise<void>;
}
