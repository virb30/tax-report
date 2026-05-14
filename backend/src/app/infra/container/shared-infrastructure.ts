import type { Knex } from 'knex';
import { TransactionFeeAllocator } from '../../../portfolio/domain/services/transaction-fee-allocator.service';
import { MemoryQueueAdapter } from '../../../shared/infra/events/memory-queue.adapter';
import type { SharedInfrastructure } from './types';

export function createSharedInfrastructure(database: Knex): SharedInfrastructure {
  return {
    database,
    queue: new MemoryQueueAdapter(),
    transactionFeeAllocator: new TransactionFeeAllocator(),
  };
}
