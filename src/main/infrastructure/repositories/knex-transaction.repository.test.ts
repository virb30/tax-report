import type { Knex } from 'knex';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { KnexTransactionRepository } from './knex-transaction.repository';
import { Transaction } from '../../domain/portfolio/entities/transaction.entity';
import { Uuid } from '../../domain/shared/uuid.vo';
import { SourceType, TransactionType } from '../../../shared/types/domain';
import { Quantity } from '../../domain/portfolio/value-objects/quantity.vo';
import { Money } from '../../domain/portfolio/value-objects/money.vo';

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
        quantity: Quantity.from(10),
        unitPrice: Money.from(20),
        fees: Money.from(0),
        brokerId: firstBrokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2025-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'VALE3',
        quantity: Quantity.from(8),
        unitPrice: Money.from(30),
        fees: Money.from(0),
        brokerId: unaffectedBrokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    await repository.replaceInitialBalanceTransactionsForTickerAndYear('PETR4', 2025, [
      Transaction.create({
        date: '2025-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'PETR4',
        quantity: Quantity.from(7),
        unitPrice: Money.from(25),
        fees: Money.from(0),
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
        quantity: Quantity.from(7).getAmount(),
        unit_price: Money.from(25).getAmount(),
        broker_id: secondBrokerId.value,
      },
    ]);
    expect(valeRows).toEqual([
      {
        quantity: Quantity.from(8).getAmount(),
        unit_price: Money.from(30).getAmount(),
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
        quantity: Quantity.from(10),
        unitPrice: Money.from(20),
        fees: Money.from(0),
        brokerId: firstBrokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2025-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'PETR4',
        quantity: Quantity.from(5),
        unitPrice: Money.from(20),
        fees: Money.from(0),
        brokerId: secondBrokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const [document] = await repository.findInitialBalanceDocumentsByYear(2025);

    expect(document).toEqual({
      ticker: 'PETR4',
      year: 2025,
      averagePrice: Money.from(20).getAmount(),
      totalQuantity: Quantity.from(15).getAmount(),
      allocations: expect.arrayContaining([
        { brokerId: firstBrokerId.value, quantity: Quantity.from(10).getAmount() },
        { brokerId: secondBrokerId.value, quantity: Quantity.from(5).getAmount() },
      ]),
    });
    expect(document?.allocations).toHaveLength(2);
  });
});
