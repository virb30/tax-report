import { generateAssetsReportContract as generateAssetsReportIpcContract } from '../../../../ipc/contracts/tax-reporting/report';
import {
  monthlyTaxDetailContract,
  monthlyTaxHistoryContract,
  recalculateMonthlyTaxHistoryContract,
} from '../../../../ipc/contracts/tax-reporting/monthly-close';
import type { IpcMainHandleRegistry } from '../../../../ipc/main/binding/ipc-main-handle-registry';
import type { Knex } from 'knex';
import { GetMonthlyTaxDetailUseCase } from '../../application/use-cases/get-monthly-tax-detail.use-case';
import { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-assets-report.use-case';
import { ListMonthlyTaxHistoryUseCase } from '../../application/use-cases/list-monthly-tax-history.use-case';
import { RecalculateMonthlyTaxHistoryUseCase } from '../../application/use-cases/recalculate-monthly-tax-history.use-case';
import type {
  IngestionModuleRepositories,
  SharedInfrastructure,
  TaxReportingPortfolioDependencies,
} from '../../../app/infra/container';
import type { AssetPositionRepository } from '../../../portfolio/application/repositories/asset-position.repository';
import type { AssetRepository } from '../../../portfolio/application/repositories/asset.repository';
import type { BrokerRepository } from '../../../portfolio/application/repositories/broker.repository';
import type { TransactionRepository } from '../../../portfolio/application/repositories/transaction.repository';
import { createAppModule } from '../../../app/infra/container/app-module';
import { MemoryQueueAdapter } from '../../../shared/infra/events/memory-queue.adapter';
import { AssetTaxClassificationChangedEvent } from '../../../shared/domain/events/asset-tax-classification-changed.event';
import { ConsolidatedPositionImportedEvent } from '../../../shared/domain/events/consolidated-position-imported.event';
import { TransactionFeesReallocatedEvent } from '../../../shared/domain/events/transaction-fees-reallocated.event';
import { TransactionsImportedEvent } from '../../../shared/domain/events/transactions-imported.event';
import { TransactionFeeAllocator } from '../../../portfolio/domain/services/transaction-fee-allocator.service';
import { KnexMonthlyTaxCloseRepository } from '../repositories/knex-monthly-tax-close.repository';
import { createTaxReportingModule } from './index';

type IpcHandler = (_event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown;
type PrivateFields = Record<string, unknown>;

function createPortfolioDependencies(): TaxReportingPortfolioDependencies {
  return {
    positionRepository: {
      findAllByYear: jest.fn().mockResolvedValue([]),
    } as unknown as AssetPositionRepository,
    brokerRepository: {
      findAll: jest.fn().mockResolvedValue([]),
    } as unknown as BrokerRepository,
    assetRepository: {
      findByTickersList: jest.fn().mockResolvedValue([]),
    } as unknown as AssetRepository,
    transactionRepository: {
      findByTicker: jest.fn().mockResolvedValue([]),
      findByPeriod: jest.fn().mockResolvedValue([]),
    } as unknown as TransactionRepository,
  };
}

function createSharedInfrastructure(): SharedInfrastructure {
  return {
    database: jest.fn() as unknown as Knex,
    queue: new MemoryQueueAdapter(),
    transactionFeeAllocator: new TransactionFeeAllocator(),
  };
}

function createIngestionRepositories(): IngestionModuleRepositories {
  return {
    dailyBrokerTaxRepository: {
      findAll: jest.fn().mockResolvedValue([]),
      findByPeriod: jest.fn().mockResolvedValue([]),
      findByDateAndBroker: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue(undefined),
      deleteByDateAndBroker: jest.fn().mockResolvedValue(false),
    },
  };
}

describe('createTaxReportingModule', () => {
  it('creates the report use case from explicit portfolio exports', () => {
    const portfolio = createPortfolioDependencies();
    const shared = createSharedInfrastructure();

    const module = createTaxReportingModule({
      shared,
      portfolio,
      ingestion: createIngestionRepositories(),
    });
    const useCase = module.useCases.generateAssetsReportUseCase as unknown as PrivateFields;

    expect(module.registerIpc).toEqual(expect.any(Function));
    expect(typeof module.startup?.initialize).toBe('function');
    expect(module.repositories.monthlyTaxCloseRepository).toBeInstanceOf(
      KnexMonthlyTaxCloseRepository,
    );
    expect(module.useCases.generateAssetsReportUseCase).toBeInstanceOf(GenerateAssetsReportUseCase);
    expect(module.useCases.listMonthlyTaxHistoryUseCase).toBeInstanceOf(
      ListMonthlyTaxHistoryUseCase,
    );
    expect(module.useCases.getMonthlyTaxDetailUseCase).toBeInstanceOf(GetMonthlyTaxDetailUseCase);
    expect(module.useCases.recalculateMonthlyTaxHistoryUseCase).toBeInstanceOf(
      RecalculateMonthlyTaxHistoryUseCase,
    );
    expect(useCase.positionRepository).toBe(portfolio.positionRepository);
    expect(useCase.brokerRepository).toBe(portfolio.brokerRepository);
    expect(useCase.assetRepository).toBe(portfolio.assetRepository);
    expect(useCase.transactionRepository).toBe(portfolio.transactionRepository);
  });

  it('can register report IPC directly and preserve report generation behavior', async () => {
    const portfolio = createPortfolioDependencies();
    const shared = createSharedInfrastructure();
    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel, listener) => {
        handlers.set(channel, listener);
      },
    };

    const module = createTaxReportingModule({
      shared,
      portfolio,
      ingestion: createIngestionRepositories(),
    });
    module.registerIpc(ipcMain);

    const handler = handlers.get(generateAssetsReportIpcContract.channel);
    await expect(handler?.({} as Electron.IpcMainInvokeEvent, { baseYear: 2025 })).resolves.toEqual(
      {
        referenceDate: '2025-12-31',
        items: [],
      },
    );
    expect(portfolio.positionRepository.findAllByYear).toHaveBeenCalledWith(2025);
    expect(portfolio.positionRepository.findAllByYear).toHaveBeenCalledWith(2024);
  });

  it('registers monthly close handlers against the IPC registry', () => {
    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel, listener) => {
        handlers.set(channel, listener);
      },
    };

    createTaxReportingModule({
      shared: createSharedInfrastructure(),
      portfolio: createPortfolioDependencies(),
      ingestion: createIngestionRepositories(),
    }).registerIpc(ipcMain);

    expect(handlers.get(monthlyTaxHistoryContract.channel)).toEqual(expect.any(Function));
    expect(handlers.get(monthlyTaxDetailContract.channel)).toEqual(expect.any(Function));
    expect(handlers.get(recalculateMonthlyTaxHistoryContract.channel)).toEqual(
      expect.any(Function),
    );
  });

  it('initializes startup and registers IPC for main-process composition', async () => {
    const handlers = new Map<string, IpcHandler>();
    const ipcMain: IpcMainHandleRegistry = {
      handle: (channel, listener) => {
        handlers.set(channel, listener);
      },
    };
    const shared = createSharedInfrastructure();
    const queue = shared.queue as MemoryQueueAdapter;
    const appModule = createAppModule();
    const taxReportingModule = createTaxReportingModule({
      shared,
      portfolio: createPortfolioDependencies(),
      ingestion: createIngestionRepositories(),
    });

    appModule.startup?.initialize();
    taxReportingModule.startup?.initialize();
    appModule.registerIpc(ipcMain);
    taxReportingModule.registerIpc(ipcMain);

    await expect(
      handlers.get(generateAssetsReportIpcContract.channel)?.({} as Electron.IpcMainInvokeEvent, {
        baseYear: 2026,
      }),
    ).resolves.toEqual({
      referenceDate: '2026-12-31',
      items: [],
    });
    expect(handlers.get(monthlyTaxHistoryContract.channel)).toEqual(expect.any(Function));
    expect(handlers.get(monthlyTaxDetailContract.channel)).toEqual(expect.any(Function));
    expect(handlers.get(recalculateMonthlyTaxHistoryContract.channel)).toEqual(
      expect.any(Function),
    );
    expect(queue.consumers.get(ConsolidatedPositionImportedEvent.name)).toHaveLength(1);
    expect(queue.consumers.get(TransactionsImportedEvent.name)).toHaveLength(1);
  });

  it('accepts ingestion daily broker tax access for monthly tax wiring without runtime coupling', () => {
    const ingestion = createIngestionRepositories();

    const module = createTaxReportingModule({
      shared: createSharedInfrastructure(),
      portfolio: createPortfolioDependencies(),
      ingestion,
    });

    expect(module.repositories.monthlyTaxCloseRepository).toBeInstanceOf(
      KnexMonthlyTaxCloseRepository,
    );
    expect(module.repositories.dailyBrokerTaxRepository).toBe(ingestion.dailyBrokerTaxRepository);
    expect(ingestion.dailyBrokerTaxRepository.findByPeriod).toEqual(expect.any(Function));
  });

  it('initializes monthly recalculation queue subscriptions once during startup', () => {
    const shared = createSharedInfrastructure();
    const queue = shared.queue as MemoryQueueAdapter;
    const module = createTaxReportingModule({
      shared,
      portfolio: createPortfolioDependencies(),
      ingestion: createIngestionRepositories(),
    });

    module.startup?.initialize();
    module.startup?.initialize();

    expect(queue.consumers.get(ConsolidatedPositionImportedEvent.name)).toHaveLength(1);
    expect(queue.consumers.get(TransactionsImportedEvent.name)).toHaveLength(1);
    expect(queue.consumers.get(TransactionFeesReallocatedEvent.name)).toHaveLength(1);
    expect(queue.consumers.get(AssetTaxClassificationChangedEvent.name)).toHaveLength(1);
  });
});
