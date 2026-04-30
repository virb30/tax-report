import type { Knex } from 'knex';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { KnexTransactionRepository } from './knex-transaction.repository';
import { Transaction } from '../../domain/portfolio/entities/transaction.entity';
import { Uuid } from '../../domain/shared/uuid.vo';
import { SourceType, TransactionType } from '../../../shared/types/domain';

describe('KnexTransactionRepository', () => {
  let database: Knex;
  let repository: KnexTransactionRepository;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, false);
    repository = new KnexTransactionRepository(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('replaces prior initial_balance rows for the same ticker and year without touching other groups', async () => {
    const firstBrokerId = Uuid.create();
    const secondBrokerId = Uuid.create();
    const unaffectedBrokerId = Uuid.create();

    await database('brokers').insert([
      {
        id: firstBrokerId.value,
        name: 'Broker A',
        cnpj: '00.000.000/0001-00',
        code: 'BRKA',
        active: 1,
      },
      {
        id: secondBrokerId.value,
        name: 'Broker B',
        cnpj: '11.111.111/0001-11',
        code: 'BRKB',
        active: 1,
      },
      {
        id: unaffectedBrokerId.value,
        name: 'Broker C',
        cnpj: '22.222.222/0001-22',
        code: 'BRKC',
        active: 1,
      },
    ]);

    await repository.saveMany([
      Transaction.create({
        date: '2025-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'PETR4',
        quantity: 10,
        unitPrice: 20,
        fees: 0,
        brokerId: firstBrokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2025-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'VALE3',
        quantity: 8,
        unitPrice: 30,
        fees: 0,
        brokerId: unaffectedBrokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    await repository.replaceInitialBalanceTransactionsForTickerAndYear('PETR4', 2025, [
      Transaction.create({
        date: '2025-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'PETR4',
        quantity: 7,
        unitPrice: 25,
        fees: 0,
        brokerId: secondBrokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const petrRows = await database('transactions')
      .where({ ticker: 'PETR4', type: TransactionType.InitialBalance })
      .select('quantity', 'unit_price', 'broker_id');
    const valeRows = await database('transactions')
      .where({ ticker: 'VALE3', type: TransactionType.InitialBalance })
      .select('quantity', 'unit_price', 'broker_id');

    expect(petrRows).toEqual([
      {
        quantity: 7,
        unit_price: 25,
        broker_id: secondBrokerId.value,
      },
    ]);
    expect(valeRows).toEqual([
      {
        quantity: 8,
        unit_price: 30,
        broker_id: unaffectedBrokerId.value,
      },
    ]);
  });

  it('lists grouped initial-balance documents for a year', async () => {
    const firstBrokerId = Uuid.create();
    const secondBrokerId = Uuid.create();

    await database('brokers').insert([
      {
        id: firstBrokerId.value,
        name: 'Broker A',
        cnpj: '00.000.000/0001-00',
        code: 'BRKA',
        active: 1,
      },
      {
        id: secondBrokerId.value,
        name: 'Broker B',
        cnpj: '11.111.111/0001-11',
        code: 'BRKB',
        active: 1,
      },
    ]);

    await repository.saveMany([
      Transaction.create({
        date: '2025-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'PETR4',
        quantity: 10,
        unitPrice: 20,
        fees: 0,
        brokerId: firstBrokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2025-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'PETR4',
        quantity: 5,
        unitPrice: 20,
        fees: 0,
        brokerId: secondBrokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const [document] = await repository.findInitialBalanceDocumentsByYear(2025);

    expect(document).toEqual({
      ticker: 'PETR4',
      year: 2025,
      averagePrice: 20,
      totalQuantity: 15,
      allocations: expect.arrayContaining([
        { brokerId: firstBrokerId.value, quantity: 10 },
        { brokerId: secondBrokerId.value, quantity: 5 },
      ]),
    });
    expect(document?.allocations).toHaveLength(2);
  });
});
