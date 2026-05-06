import { asClass, asValue } from 'awilix';
import type { Knex } from 'knex';
import { TransactionFeeAllocator } from '../../../portfolio/domain/services/transaction-fee-allocator.service';
import { MemoryQueueAdapter } from '../../../shared/infra/events/memory-queue.adapter';
import type { MainContainer } from './types';

export function registerSharedInfrastructure(container: MainContainer, database: Knex): void {
  container.register({
    database: asValue(database),
    queue: asClass(MemoryQueueAdapter).singleton(),
    transactionFeeAllocator: asClass(TransactionFeeAllocator).singleton(),
  });
}
