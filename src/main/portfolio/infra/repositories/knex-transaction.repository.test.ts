import type { Knex } from 'knex';
import { createDatabaseConnection, initializeDatabase } from '../../../app/infra/database/database';
import { KnexTransactionRepository } from './knex-transaction.repository';
import { KnexTransactionFeeRepository } from './knex-transaction-fee.repository';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionFee } from '../../domain/entities/transaction-fee.entity';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { SourceType, TransactionType } from '../../../shared/types/domain';
import { Quantity } from '../../domain/value-objects/quantity.vo';
import { Money } from '../../domain/value-objects/money.vo';

describe('KnexTransactionRepository', () => {
  let database: Knex;
  let repository: KnexTransactionRepository;
  let feeRepository: KnexTransactionFeeRepository;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, false);
    repository = new KnexTransactionRepository(database);
    feeRepository = new KnexTransactionFeeRepository(database);
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

  it('saves transactions without storing fees on the transactions table', async () => {
    const brokerId = Uuid.create();
    await insertBroker(brokerId);

    await repository.save(
      Transaction.create({
        date: '2025-04-01',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: Quantity.from(1),
        unitPrice: Money.from(10),
        fees: Money.from(2),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    );

    const columns = await database.raw("PRAGMA table_info('transactions')");
    const rows = await database('transactions').select('*');

    expect(columns.map((column: { name: string }) => column.name)).not.toContain('fees');
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty('fees');
  });

  it('reads fees from transaction_fees projection', async () => {
    const brokerId = Uuid.create();
    await insertBroker(brokerId);
    const transaction = Transaction.create({
      date: '2025-04-01',
      type: TransactionType.Buy,
      ticker: 'PETR4',
      quantity: Quantity.from(1),
      unitPrice: Money.from(10),
      fees: Money.from(0),
      brokerId,
      sourceType: SourceType.Manual,
    });
    await repository.save(transaction);
    await feeRepository.replaceForTransactions({
      transactionIds: [transaction.id],
      fees: [
        TransactionFee.create({
          transactionId: transaction.id,
          totalFees: Money.from(1.23),
        }),
      ],
    });

    const [storedTransaction] = await repository.findByTicker('PETR4');

    expect(storedTransaction?.fees.getAmount()).toBe('1.23');
  });

  it('falls back to zero fees when projection is missing', async () => {
    const brokerId = Uuid.create();
    await insertBroker(brokerId);
    await repository.save(
      Transaction.create({
        date: '2025-04-01',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: Quantity.from(1),
        unitPrice: Money.from(10),
        fees: Money.from(9),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    );

    const [storedTransaction] = await repository.findByTicker('PETR4');

    expect(storedTransaction?.fees.getAmount()).toBe('0');
  });

  it('replaces transaction fee projections for a transaction set', async () => {
    const brokerId = Uuid.create();
    await insertBroker(brokerId);
    const firstTransaction = Transaction.create({
      date: '2025-04-01',
      type: TransactionType.Buy,
      ticker: 'PETR4',
      quantity: Quantity.from(1),
      unitPrice: Money.from(10),
      fees: Money.from(0),
      brokerId,
      sourceType: SourceType.Manual,
    });
    const secondTransaction = Transaction.create({
      date: '2025-04-01',
      type: TransactionType.Buy,
      ticker: 'VALE3',
      quantity: Quantity.from(1),
      unitPrice: Money.from(10),
      fees: Money.from(0),
      brokerId,
      sourceType: SourceType.Manual,
    });
    await repository.saveMany([firstTransaction, secondTransaction]);

    await feeRepository.replaceForTransactions({
      transactionIds: [firstTransaction.id, secondTransaction.id],
      fees: [
        TransactionFee.create({
          transactionId: firstTransaction.id,
          totalFees: Money.from(1),
        }),
        TransactionFee.create({
          transactionId: secondTransaction.id,
          totalFees: Money.from(2),
        }),
      ],
    });
    await feeRepository.replaceForTransactions({
      transactionIds: [firstTransaction.id, secondTransaction.id],
      fees: [
        TransactionFee.create({
          transactionId: secondTransaction.id,
          totalFees: Money.from(3),
        }),
      ],
    });

    const rows = await database('transaction_fees')
      .orderBy('transaction_id', 'asc')
      .select('transaction_id', 'total_fees');

    expect(rows).toEqual([
      {
        transaction_id: secondTransaction.id.value,
        total_fees: '3',
      },
    ]);
  });

  it('does nothing when replacing projections for an empty transaction set', async () => {
    await expect(
      feeRepository.replaceForTransactions({
        transactionIds: [],
        fees: [],
      }),
    ).resolves.toBeUndefined();
  });

  it('deletes existing projections when replacement fees are empty', async () => {
    const brokerId = Uuid.create();
    await insertBroker(brokerId);
    const transaction = Transaction.create({
      date: '2025-04-01',
      type: TransactionType.Buy,
      ticker: 'PETR4',
      quantity: Quantity.from(1),
      unitPrice: Money.from(10),
      fees: Money.from(0),
      brokerId,
      sourceType: SourceType.Manual,
    });
    await repository.save(transaction);
    await feeRepository.replaceForTransactions({
      transactionIds: [transaction.id],
      fees: [
        TransactionFee.create({
          transactionId: transaction.id,
          totalFees: Money.from(1),
        }),
      ],
    });

    await feeRepository.replaceForTransactions({
      transactionIds: [transaction.id],
      fees: [],
    });

    const rows = await database('transaction_fees').select('*');
    expect(rows).toEqual([]);
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

  async function insertBroker(brokerId: Uuid): Promise<void> {
    await database('brokers').insert({
      id: brokerId.value,
      name: 'Broker A',
      cnpj: '00.000.000/0001-00',
      code: 'BRKA',
      active: 1,
    });
  }
});
