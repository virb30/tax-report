import type { Knex } from 'knex';
import { assetIpcContracts, listAssetsContract } from '../../../../ipc/contracts/portfolio/assets';
import {
  brokerIpcContracts,
  createBrokerContract,
} from '../../../../ipc/contracts/portfolio/brokers';
import {
  portfolioIpcContracts,
  saveInitialBalanceDocumentContract,
} from '../../../../ipc/contracts/portfolio/portfolio';
import type { IpcMainHandleRegistry } from '../../../../ipc/main/binding/ipc-main-handle-registry';
import type { SharedInfrastructure } from '../../../app/infra/container';
import type { Queue } from '../../../shared/application/events/queue.interface';
import { ConsolidatedPositionImportedEvent } from '../../../shared/domain/events/consolidated-position-imported.event';
import { TransactionFeesReallocatedEvent } from '../../../shared/domain/events/transaction-fees-reallocated.event';
import { TransactionsImportedEvent } from '../../../shared/domain/events/transactions-imported.event';
import { MemoryQueueAdapter } from '../../../shared/infra/events/memory-queue.adapter';
import { TransactionFeeAllocator } from '../../domain/services/transaction-fee-allocator.service';
import { KnexAssetRepository } from '../repositories/knex-asset.repository';
import { KnexBrokerRepository } from '../repositories/knex-broker.repository';
import { KnexPositionRepository } from '../repositories/knex-position.repository';
import { KnexTransactionFeeRepository } from '../repositories/knex-transaction-fee.repository';
import { KnexTransactionRepository } from '../repositories/knex-transaction.repository';
import { createPortfolioModule } from './index';

type IpcHandler = (_event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown;

class RecordingQueue implements Queue {
  readonly subscriptions: Array<{ eventName: string; handler: unknown }> = [];

  async publish(): Promise<void> {
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

  it('creates asset IPC handlers with the explicitly wired repository dependency', async () => {
    const database = createAssetListDatabase([
      {
        ticker: 'PETR4',
        asset_type: null,
        resolution_source: null,
        name: 'Petrobras',
        cnpj: '33.000.167/0001-01',
      },
    ]);
    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel, listener) => {
        handlers.set(channel, listener);
      },
    };

    const module = createPortfolioModule(createShared(database));
    module.registerIpc(ipcMain);

    const handler = handlers.get(listAssetsContract.channel);
    await expect(handler?.({} as Electron.IpcMainInvokeEvent, undefined)).resolves.toEqual({
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

  it('registers broker, asset, and portfolio-flow IPC channels directly from the module', () => {
    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel, listener) => {
        handlers.set(channel, listener);
      },
    };

    const module = createPortfolioModule(createShared(jest.fn() as unknown as Knex));
    module.registerIpc(ipcMain);

    expect([...handlers.keys()].sort()).toEqual(
      [...brokerIpcContracts, ...assetIpcContracts, ...portfolioIpcContracts]
        .map((contract) => contract.channel)
        .sort(),
    );
  });

  it('preserves broker failure mapping on direct module bindings', async () => {
    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel, listener) => {
        handlers.set(channel, listener);
      },
    };
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const module = createPortfolioModule(createShared(jest.fn() as unknown as Knex));
    module.registerIpc(ipcMain);

    const handler = handlers.get(createBrokerContract.channel);
    await expect(
      handler?.({} as Electron.IpcMainInvokeEvent, {
        name: 'XP',
        cnpj: '12.345.678/0001-90',
      }),
    ).resolves.toEqual({
      success: false,
      error: 'Invalid code for create broker.',
    });
    consoleErrorSpy.mockRestore();
  });

  it('preserves portfolio result failure mapping on direct module bindings', async () => {
    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel, listener) => {
        handlers.set(channel, listener);
      },
    };

    const module = createPortfolioModule(createShared(jest.fn() as unknown as Knex));
    module.registerIpc(ipcMain);

    const handler = handlers.get(saveInitialBalanceDocumentContract.channel);
    await expect(
      handler?.({} as Electron.IpcMainInvokeEvent, {
        ticker: '',
        year: 2025,
        assetType: 'stock',
        averagePrice: '30',
        allocations: [{ brokerId: 'broker-xp', quantity: '10' }],
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Invalid ticker for initial balance.',
        kind: 'validation',
      },
    });
  });

  it('allows downstream composition to consume portfolio exports without Awilix', () => {
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
