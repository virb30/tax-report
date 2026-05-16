import type { Knex } from 'knex';
import { MemoryQueueAdapter } from '../infra/events/memory-queue.adapter';
import type { Queue } from '../infra/events/queue.interface';

export interface SharedInfrastructure {
  database: Knex;
  queue: Queue;
}

export function createSharedInfrastructure(database: Knex): SharedInfrastructure {
  return {
    database,
    queue: new MemoryQueueAdapter(),
  };
}
