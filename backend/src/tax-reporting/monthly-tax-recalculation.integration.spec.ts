import type { Knex } from 'knex';
import { createDatabaseConnection, initializeDatabase } from '../app/infra/database/database';
import type { TaxReportingPortfolioDependencies } from './tax-reporting.module';
import { KnexDailyBrokerTaxRepository } from '../ingestion/infra/repositories/knex-daily-broker-tax.repository';
import { Asset } from '../portfolio/domain/entities/asset.entity';
import { Transaction } from '../portfolio/domain/entities/transaction.entity';
import { Money } from '../portfolio/domain/value-objects/money.vo';
import { Quantity } from '../portfolio/domain/value-objects/quantity.vo';
import { KnexAssetRepository } from '../portfolio/infra/repositories/knex-asset.repository';
import { KnexTransactionRepository } from '../portfolio/infra/repositories/knex-transaction.repository';
import { Uuid } from '../shared/domain/value-objects/uuid.vo';
import { TransactionFeesReallocatedEvent } from '../shared/domain/events/transaction-fees-reallocated.event';
import { TransactionsImportedEvent } from '../shared/domain/events/transactions-imported.event';
import { MemoryQueueAdapter } from '../shared/infra/events/memory-queue.adapter';
import { AssetType, AssetTypeSource, SourceType, TransactionType } from '../shared/types/domain';
import { DailyBrokerTax } from '../ingestion/domain/entities/daily-broker-tax.entity';
import type { SharedInfrastructure } from '../shared/application/shared-infrastructure';
import { TaxReportingModule } from './tax-reporting.module';

type TaxReportingModuleAccess = {
  repositories: {
    monthlyTaxCloseRepository: {
      findHistory(): Promise<Array<{ month: string }>>;
      findDetail(month: string): Promise<unknown>;
    };
  };
};

describe('monthly tax recalculation integration', () => {
  let database: Knex;
  let brokerId: Uuid;
  let shared: SharedInfrastructure;
  let transactionRepository: KnexTransactionRepository;
  let assetRepository: KnexAssetRepository;
  let dailyBrokerTaxRepository: KnexDailyBrokerTaxRepository;

  beforeEach(async () => {
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, false);
    brokerId = Uuid.create();
    shared = {
      database,
      queue: new MemoryQueueAdapter(),
    };
    transactionRepository = new KnexTransactionRepository(database);
    assetRepository = new KnexAssetRepository(database);
    dailyBrokerTaxRepository = new KnexDailyBrokerTaxRepository(database);

    await database('brokers').insert({
      id: brokerId.value,
      name: 'Integration Broker',
      cnpj: '11.111.111/0001-11',
    });
    await assetRepository.save(
      Asset.create({
        ticker: 'MXRF11',
        assetType: AssetType.Fii,
        resolutionSource: AssetTypeSource.Manual,
      }),
    );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await database.destroy();
  });

  it('refreshes downstream monthly artifacts before transactions-imported publishing completes', async () => {
    const module = new TaxReportingModule({
      shared,
      portfolio: createPortfolioDependencies({
        transactionRepository,
        assetRepository,
      }),
      ingestion: { dailyBrokerTaxRepository },
    }) as unknown as TaxReportingModuleAccess;
    await saveTransactionSet();

    await shared.queue.publish(new TransactionsImportedEvent({ ticker: 'MXRF11', year: 2026 }));

    const history = await module.repositories.monthlyTaxCloseRepository.findHistory();
    const detail = await module.repositories.monthlyTaxCloseRepository.findDetail('2026-02');

    expect(history.map((item) => item.month)).toEqual(['2026-01', '2026-02']);
    expect(detail).toMatchObject({
      month: '2026-02',
      outcome: 'tax_due',
      netTaxDue: '26.00',
    });
  });

  it('updates later months affected by carry-forward calculations after fee reallocation events', async () => {
    const module = new TaxReportingModule({
      shared,
      portfolio: createPortfolioDependencies({
        transactionRepository,
        assetRepository,
      }),
      ingestion: { dailyBrokerTaxRepository },
    }) as unknown as TaxReportingModuleAccess;
    const { januarySale } = await saveTransactionSet();
    await shared.queue.publish(new TransactionsImportedEvent({ ticker: 'MXRF11', year: 2026 }));

    await database('transaction_fees')
      .insert({
        transaction_id: januarySale.id.value,
        total_fees: '25.00',
      })
      .onConflict('transaction_id')
      .merge({
        total_fees: '25.00',
      });
    await shared.queue.publish(
      new TransactionFeesReallocatedEvent({ ticker: 'MXRF11', year: 2026 }),
    );

    const january = await module.repositories.monthlyTaxCloseRepository.findDetail('2026-01');
    const february = await module.repositories.monthlyTaxCloseRepository.findDetail('2026-02');

    expect(january).toMatchObject({
      month: '2026-01',
      outcome: 'below_threshold',
      netTaxDue: '3.00',
      carryForwardOut: '3.00',
    });
    expect(february).toMatchObject({
      month: '2026-02',
      outcome: 'tax_due',
      netTaxDue: '21.00',
      changeSummary: 'Net tax due changed from 26.00 to 21.00.',
    });
  });

  async function saveTransactionSet(): Promise<{ januarySale: Transaction }> {
    const januarySale = Transaction.restore({
      id: Uuid.create(),
      date: '2026-01-10',
      type: TransactionType.Sell,
      ticker: 'MXRF11',
      quantity: Quantity.from(1),
      unitPrice: Money.from('50'),
      fees: Money.from(0),
      brokerId,
      sourceType: SourceType.Manual,
    });
    const februarySale = Transaction.restore({
      id: Uuid.create(),
      date: '2026-02-10',
      type: TransactionType.Sell,
      ticker: 'MXRF11',
      quantity: Quantity.from(1),
      unitPrice: Money.from('100'),
      fees: Money.from(0),
      brokerId,
      sourceType: SourceType.Manual,
    });
    await transactionRepository.saveMany([
      Transaction.restore({
        id: Uuid.create(),
        date: '2026-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'MXRF11',
        quantity: Quantity.from(3),
        unitPrice: Money.from('10'),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
      januarySale,
      februarySale,
    ]);
    await dailyBrokerTaxRepository.upsert(
      DailyBrokerTax.create({
        date: '2026-01-10',
        brokerId,
        fees: Money.from(0),
        irrf: Money.from(0),
      }),
    );
    await dailyBrokerTaxRepository.upsert(
      DailyBrokerTax.create({
        date: '2026-02-10',
        brokerId,
        fees: Money.from(0),
        irrf: Money.from(0),
      }),
    );

    return { januarySale };
  }
});

function createPortfolioDependencies(input: {
  transactionRepository: KnexTransactionRepository;
  assetRepository: KnexAssetRepository;
}): TaxReportingPortfolioDependencies {
  return {
    positionRepository: {
      findAllByYear: jest.fn().mockResolvedValue([]),
    },
    brokerRepository: {
      findAll: jest.fn().mockResolvedValue([]),
    },
    assetRepository: input.assetRepository,
    transactionRepository: input.transactionRepository,
  } as unknown as TaxReportingPortfolioDependencies;
}
