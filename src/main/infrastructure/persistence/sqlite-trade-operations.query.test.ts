import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { OperationRepository } from '../../database/repositories/operation-repository';
import { OperationType, SourceType } from '../../../shared/types/domain';
import { SqliteTradeOperationsQuery } from './sqlite-trade-operations.query';

describe('SqliteTradeOperationsQuery', () => {
  let database: Knex;
  let operationRepository: OperationRepository;
  let query: SqliteTradeOperationsQuery;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);
    operationRepository = new OperationRepository(database);
    query = new SqliteTradeOperationsQuery(operationRepository);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('filters trades by ticker and broker', async () => {
    await operationRepository.create({
      tradeDate: '2025-01-01',
      operationType: OperationType.Buy,
      ticker: 'PETR4',
      quantity: 2,
      unitPrice: 20,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Pdf,
    });
    await operationRepository.create({
      tradeDate: '2025-01-02',
      operationType: OperationType.Sell,
      ticker: 'PETR4',
      quantity: 1,
      unitPrice: 21,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'NU',
      sourceType: SourceType.Pdf,
    });

    const trades = await query.findTradesByTickerAndBroker({
      ticker: 'PETR4',
      broker: 'XP',
    });

    expect(trades).toEqual([
      {
        operationType: OperationType.Buy,
        quantity: 2,
        unitPrice: 20,
        operationalCosts: 0,
      },
    ]);
  });
});
