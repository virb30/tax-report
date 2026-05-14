import type { Knex } from 'knex';
import type { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import type { TransactionFeeRepository } from '../../application/repositories/transaction-fee.repository';
import type { TransactionFee } from '../../domain/entities/transaction-fee.entity';

type TransactionFeeRow = {
  transaction_id: string;
  total_fees: string;
  created_at?: string;
  updated_at?: string;
};

function toPersistence(transactionFee: TransactionFee): TransactionFeeRow {
  return {
    transaction_id: transactionFee.transactionId.value,
    total_fees: transactionFee.totalFeesAmount,
  };
}

export class KnexTransactionFeeRepository implements TransactionFeeRepository {
  constructor(private readonly database: Knex) {}

  async replaceForTransactions(input: {
    transactionIds: Uuid[];
    fees: TransactionFee[];
  }): Promise<void> {
    if (input.transactionIds.length === 0) {
      return;
    }

    await this.database.transaction(async (trx) => {
      await trx('transaction_fees')
        .whereIn(
          'transaction_id',
          input.transactionIds.map((transactionId) => transactionId.value),
        )
        .delete();

      if (input.fees.length === 0) {
        return;
      }

      await trx('transaction_fees').insert(input.fees.map((fee) => toPersistence(fee)));
    });
  }
}
