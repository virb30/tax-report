import type { Knex } from 'knex';
import { createDatabaseConnection, initializeDatabase } from '../app/infra/database/database';
import { RecordingMemoryQueueAdapter } from '../shared/infra/events/recording-memory-queue.adapter';
import type { SharedInfrastructure } from '../shared/application/shared-infrastructure';
import type { Queue } from '../shared/infra/events/queue.interface';
import { AssetTaxClassificationChangedEvent } from '../shared/domain/events/asset-tax-classification-changed.event';
import { ConsolidatedPositionImportedEvent } from '../shared/domain/events/consolidated-position-imported.event';
import { TransactionFeesReallocatedEvent } from '../shared/domain/events/transaction-fees-reallocated.event';
import { TransactionsImportedEvent } from '../shared/domain/events/transactions-imported.event';
import { Cnpj } from '../shared/domain/value-objects/cnpj.vo';
import { MemoryQueueAdapter } from '../shared/infra/events/memory-queue.adapter';
import { RecordingMemoryAdapterHttp } from '../shared/infra/http/recording-memory-adapter.http';
import { AssetType, AssetTypeSource, SourceType, TransactionType } from '../shared/types/domain';
import { Asset } from './domain/entities/asset.entity';
import { AssetPosition } from './domain/entities/asset-position.entity';
import { Broker } from './domain/entities/broker.entity';
import { Transaction } from './domain/entities/transaction.entity';
import { Money } from './domain/value-objects/money.vo';
import { Quantity } from './domain/value-objects/quantity.vo';
import { KnexAssetRepository } from './infra/repositories/knex-asset.repository';
import { KnexBrokerRepository } from './infra/repositories/knex-broker.repository';
import { KnexPositionRepository } from './infra/repositories/knex-position.repository';
import { KnexTransactionFeeRepository } from './infra/repositories/knex-transaction-fee.repository';
import { KnexTransactionRepository } from './infra/repositories/knex-transaction.repository';
import { PortfolioModule } from './portfolio.module';

function createShared(
  database: Knex,
  queue: Queue = new MemoryQueueAdapter(),
): SharedInfrastructure {
  return {
    database,
    queue,
  };
}

function createAssetListDatabase(rows: unknown[]): Knex {
  const orderBy = jest.fn().mockResolvedValue(rows);
  const select = jest.fn(() => ({ orderBy }));
  const database = jest.fn((table: string) => {
    expect(table).toBe('ticker_data');
    return { select };
  });

  return database as unknown as Knex;
}

interface PortfolioModuleTestAccess {
  useCases: {
    listAssetsUseCase: {
      execute(): Promise<unknown>;
    };
    repairAssetTypeUseCase: {
      execute(input: { ticker: string; assetType: AssetType }): Promise<unknown>;
    };
  };
}

describe('PortfolioModule', () => {
  it('returns the expected repository exports for downstream modules', () => {
    const module = new PortfolioModule({
      shared: createShared(jest.fn() as unknown as Knex),
    });

    expect(Object.keys(module.exports).sort()).toEqual([
      'assetRepository',
      'brokerRepository',
      'positionRepository',
      'transactionFeeRepository',
      'transactionRepository',
    ]);
    expect(module.exports.brokerRepository).toBeInstanceOf(KnexBrokerRepository);
    expect(module.exports.positionRepository).toBeInstanceOf(KnexPositionRepository);
    expect(module.exports.transactionRepository).toBeInstanceOf(KnexTransactionRepository);
    expect(module.exports.transactionFeeRepository).toBeInstanceOf(KnexTransactionFeeRepository);
    expect(module.exports.assetRepository).toBeInstanceOf(KnexAssetRepository);
  });

  it('registers portfolio HTTP routes when instantiated with an Http adapter', () => {
    const http = new RecordingMemoryAdapterHttp();

    new PortfolioModule({
      shared: createShared(jest.fn() as unknown as Knex),
      http,
    });

    expect(http.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'get /api/brokers',
      'post /api/brokers',
      'patch /api/brokers/{id}',
      'post /api/brokers/{id}/toggle-active',
      'get /api/assets',
      'patch /api/assets/{ticker}',
      'post /api/assets/{ticker}/repair-type',
      'get /api/initial-balances',
      'post /api/initial-balances',
      'delete /api/initial-balances/{year}/{ticker}',
      'get /api/positions',
      'delete /api/positions',
      'delete /api/positions/{ticker}',
      'post /api/positions/recalculate',
      'post /api/positions/migrate-year',
    ]);
  });

  it('subscribes recalculation handlers immediately in the constructor', () => {
    const queue = new RecordingMemoryQueueAdapter();

    new PortfolioModule({
      shared: createShared(jest.fn() as unknown as Knex, queue),
    });

    expect(queue.subscriptions.map((subscription) => subscription.eventName)).toEqual([
      ConsolidatedPositionImportedEvent.name,
      TransactionsImportedEvent.name,
      TransactionFeesReallocatedEvent.name,
    ]);
  });

  it('uses the explicitly wired repository dependency when listing assets', async () => {
    const database = createAssetListDatabase([
      {
        ticker: 'PETR4',
        asset_type: null,
        resolution_source: null,
        name: 'Petrobras',
        cnpj: '33.000.167/0001-01',
      },
    ]);

    const module = new PortfolioModule({
      shared: createShared(database),
    });

    const moduleAccess = module as unknown as PortfolioModuleTestAccess;

    await expect(moduleAccess.useCases.listAssetsUseCase.execute()).resolves.toEqual({
      items: [
        {
          ticker: 'PETR4',
          assetType: null,
          resolutionSource: null,
          name: 'Petrobras',
          cnpj: '33.000.167/0001-01',
          isReportReadyMetadata: true,
        },
      ],
    });
  });

  it('composes asset repair with queue publication support intact', async () => {
    const database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);
    const queue = new RecordingMemoryQueueAdapter();
    const module = new PortfolioModule({
      shared: createShared(database, queue),
    });
    const broker = Broker.create({
      code: 'RPR1',
      name: 'Repair Broker',
      cnpj: new Cnpj('11.111.111/0001-00'),
    });
    await module.exports.brokerRepository.save(broker);
    await module.exports.assetRepository.save(
      Asset.create({
        ticker: 'AAPL34',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.File,
      }),
    );
    await module.exports.transactionRepository.saveMany([
      Transaction.create({
        date: '2024-01-10',
        type: TransactionType.Buy,
        ticker: 'AAPL34',
        quantity: Quantity.from(1),
        unitPrice: Money.from(100),
        fees: Money.from(0),
        brokerId: broker.id,
        sourceType: SourceType.Csv,
      }),
    ]);
    await module.exports.positionRepository.save(
      AssetPosition.create({
        ticker: 'AAPL34',
        assetType: AssetType.Stock,
        year: 2024,
      }),
    );

    const moduleAccess = module as unknown as PortfolioModuleTestAccess;

    await expect(
      moduleAccess.useCases.repairAssetTypeUseCase.execute({
        ticker: 'AAPL34',
        assetType: AssetType.Bdr,
      }),
    ).resolves.toEqual({
      ticker: 'AAPL34',
      assetType: AssetType.Bdr,
      affectedYears: [2024],
      reprocessedCount: 1,
    });
    expect(queue.publishedEvents).toEqual([
      expect.objectContaining({
        name: AssetTaxClassificationChangedEvent.name,
        ticker: 'AAPL34',
        earliestYear: 2024,
      }),
    ]);
    await database.destroy();
  });

  it('allows downstream composition to consume portfolio exports without a root DI container', () => {
    const module = new PortfolioModule({
      shared: createShared(jest.fn() as unknown as Knex),
    });

    const downstreamDependencies = {
      assetRepository: module.exports.assetRepository,
      brokerRepository: module.exports.brokerRepository,
      transactionRepository: module.exports.transactionRepository,
      transactionFeeRepository: module.exports.transactionFeeRepository,
    };

    expect(downstreamDependencies).toEqual({
      assetRepository: module.exports.assetRepository,
      brokerRepository: module.exports.brokerRepository,
      transactionRepository: module.exports.transactionRepository,
      transactionFeeRepository: module.exports.transactionFeeRepository,
    });
  });
});
