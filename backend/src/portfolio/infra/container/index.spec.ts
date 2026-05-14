import type { Knex } from 'knex';
import { createDatabaseConnection, initializeDatabase } from '../../../app/infra/database/database';
import type { SharedInfrastructure } from '../../../app/infra/container';
import type { Queue } from '../../../shared/application/events/queue.interface';
import {
  AssetType,
  AssetTypeSource,
  SourceType,
  TransactionType,
} from '../../../shared/types/domain';
import { AssetTaxClassificationChangedEvent } from '../../../shared/domain/events/asset-tax-classification-changed.event';
import { ConsolidatedPositionImportedEvent } from '../../../shared/domain/events/consolidated-position-imported.event';
import { TransactionFeesReallocatedEvent } from '../../../shared/domain/events/transaction-fees-reallocated.event';
import { TransactionsImportedEvent } from '../../../shared/domain/events/transactions-imported.event';
import { MemoryQueueAdapter } from '../../../shared/infra/events/memory-queue.adapter';
import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';
import { Asset } from '../../domain/entities/asset.entity';
import { AssetPosition } from '../../domain/entities/asset-position.entity';
import { Broker } from '../../domain/entities/broker.entity';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionFeeAllocator } from '../../domain/services/transaction-fee-allocator.service';
import { Money } from '../../domain/value-objects/money.vo';
import { Quantity } from '../../domain/value-objects/quantity.vo';
import { KnexAssetRepository } from '../repositories/knex-asset.repository';
import { KnexBrokerRepository } from '../repositories/knex-broker.repository';
import { KnexPositionRepository } from '../repositories/knex-position.repository';
import { KnexTransactionFeeRepository } from '../repositories/knex-transaction-fee.repository';
import { KnexTransactionRepository } from '../repositories/knex-transaction.repository';
import { createPortfolioModule } from './index';

class RecordingQueue implements Queue {
  readonly subscriptions: Array<{ eventName: string; handler: unknown }> = [];
  readonly publishedEvents: unknown[] = [];

  async publish(event: unknown): Promise<void> {
    this.publishedEvents.push(event);
    return Promise.resolve();
  }

  subscribe(eventName: string, handler: unknown): void {
    this.subscriptions.push({ eventName, handler });
  }
}

function createShared(
  database: Knex,
  queue: Queue = new MemoryQueueAdapter(),
): SharedInfrastructure {
  return {
    database,
    queue,
    transactionFeeAllocator: new TransactionFeeAllocator(),
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

describe('createPortfolioModule', () => {
  it('returns the expected repository exports for downstream modules', () => {
    const shared = createShared(jest.fn() as unknown as Knex);

    const module = createPortfolioModule(shared);

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

  it('exposes portfolio use cases without desktop transport registration', () => {
    const module = createPortfolioModule(createShared(jest.fn() as unknown as Knex));

    expect(Object.keys(module.useCases).sort()).toEqual([
      'createBrokerUseCase',
      'deleteInitialBalanceDocumentUseCase',
      'deletePositionUseCase',
      'importConsolidatedPositionUseCase',
      'listAssetsUseCase',
      'listBrokersUseCase',
      'listInitialBalanceDocumentsUseCase',
      'listPositionsUseCase',
      'migrateYearUseCase',
      'recalculatePositionUseCase',
      'repairAssetTypeUseCase',
      'saveInitialBalanceDocumentUseCase',
      'toggleActiveBrokerUseCase',
      'updateAssetUseCase',
      'updateBrokerUseCase',
    ]);
    expect('registerIpc' in module).toBe(false);
  });

  it('initializes recalculation subscriptions through the startup hook', () => {
    const queue = new RecordingQueue();
    const module = createPortfolioModule(createShared(jest.fn() as unknown as Knex, queue));

    expect(queue.subscriptions).toEqual([]);

    module.startup?.initialize();
    module.startup?.initialize();

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

    const module = createPortfolioModule(createShared(database));

    await expect(module.useCases.listAssetsUseCase.execute()).resolves.toEqual({
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
    const queue = new RecordingQueue();
    const module = createPortfolioModule(createShared(database, queue));
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

    await expect(
      module.useCases.repairAssetTypeUseCase.execute({
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
    const module = createPortfolioModule(createShared(jest.fn() as unknown as Knex));

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
