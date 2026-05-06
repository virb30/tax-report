import { createContainer, InjectionMode } from 'awilix';
import type { Knex } from 'knex';
import { healthCheckContract } from '../../../../ipc/contracts/app';
import { previewImportTransactionsContract } from '../../../../ipc/contracts/ingestion/import';
import { listAssetsContract } from '../../../../ipc/contracts/portfolio/assets';
import { listBrokersContract } from '../../../../ipc/contracts/portfolio/brokers';
import { listPositionsContract } from '../../../../ipc/contracts/portfolio/portfolio';
import { generateAssetsReportContract } from '../../../../ipc/contracts/tax-reporting/report';
import { registerIngestionContext } from '../../../ingestion/infra/container';
import { registerPortfolioContext } from '../../../portfolio/infra/container';
import { registerTaxReportingContext } from '../../../tax-reporting/infra/container';
import { MemoryQueueAdapter } from '../../../shared/infra/events/memory-queue.adapter';
import { createMainBootstrap, registerAppContext } from './index';
import { registerSharedInfrastructure } from './shared-infrastructure';
import type { AppCradle, MainContainer } from './types';

type IpcHandler = (_event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown;

function createTestContainer(): MainContainer {
  return createContainer<AppCradle>({
    injectionMode: InjectionMode.CLASSIC,
  });
}

function registrationKeys(container: MainContainer): string[] {
  return Object.keys(container.registrations);
}

describe('main bootstrap container', () => {
  it('creates a fresh container per bootstrap invocation and returns the ipc registry', () => {
    const firstDatabase = {} as Knex;
    const secondDatabase = {} as Knex;

    const firstBootstrap = createMainBootstrap(firstDatabase);
    const secondBootstrap = createMainBootstrap(secondDatabase);

    expect(firstBootstrap.container).not.toBe(secondBootstrap.container);
    expect(firstBootstrap.ipcRegistry).toBe(firstBootstrap.container.cradle.ipcRegistry);
    expect(secondBootstrap.ipcRegistry).toBe(secondBootstrap.container.cradle.ipcRegistry);
    expect(firstBootstrap.container.cradle.database).toBe(firstDatabase);
    expect(secondBootstrap.container.cradle.database).toBe(secondDatabase);
  });

  it('registers shared infrastructure only from the root helper', () => {
    const container = createTestContainer();
    const database = {} as Knex;

    registerSharedInfrastructure(container, database);

    expect(container.resolve('database')).toBe(database);
    expect(container.resolve('queue')).toBeInstanceOf(MemoryQueueAdapter);
    expect(container.resolve('transactionFeeAllocator')).toBeDefined();
    expect(registrationKeys(container)).toEqual(['database', 'queue', 'transactionFeeAllocator']);
  });

  it('keeps context-owned registration keys in each bounded context module', () => {
    const appContainer = createTestContainer();
    const portfolioContainer = createTestContainer();
    const ingestionContainer = createTestContainer();
    const reportingContainer = createTestContainer();

    registerAppContext(appContainer);
    registerPortfolioContext(portfolioContainer);
    registerIngestionContext(ingestionContainer);
    registerTaxReportingContext(reportingContainer);

    expect(registrationKeys(appContainer)).toEqual(['appIpcRegistrar']);
    expect(registrationKeys(portfolioContainer)).toEqual(
      expect.arrayContaining([
        'brokerRepository',
        'assetRepository',
        'createBrokerUseCase',
        'listPositionsUseCase',
        'recalculatePositionHandler',
        'brokersIpcRegistrar',
        'assetsIpcRegistrar',
        'portfolioIpcRegistrar',
      ]),
    );
    expect(registrationKeys(ingestionContainer)).toEqual(
      expect.arrayContaining([
        'dailyBrokerTaxRepository',
        'transactionParser',
        'importTransactionsUseCase',
        'importConsolidatedPositionUseCase',
        'importIpcRegistrar',
      ]),
    );
    expect(registrationKeys(reportingContainer)).toEqual([
      'generateAssetsReportUseCase',
      'reportIpcRegistrar',
    ]);
  });

  it('resolves expected use cases and registrars from the modular bootstrap', () => {
    const bootstrap = createMainBootstrap({} as Knex);
    const container = bootstrap.container;

    expect(container.resolve('appIpcRegistrar')).toBeDefined();
    expect(container.resolve('brokersIpcRegistrar')).toBeDefined();
    expect(container.resolve('assetsIpcRegistrar')).toBeDefined();
    expect(container.resolve('portfolioIpcRegistrar')).toBeDefined();
    expect(container.resolve('importIpcRegistrar')).toBeDefined();
    expect(container.resolve('reportIpcRegistrar')).toBeDefined();
    expect(container.resolve('createBrokerUseCase')).toBeDefined();
    expect(container.resolve('listAssetsUseCase')).toBeDefined();
    expect(container.resolve('importTransactionsUseCase')).toBeDefined();
    expect(container.resolve('previewImportUseCase')).toBeDefined();
    expect(container.resolve('generateAssetsReportUseCase')).toBeDefined();
  });

  it('assembles all IPC registrars into a registry that can register startup handlers', () => {
    const bootstrap = createMainBootstrap({} as Knex);
    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: (channel: string, listener: IpcHandler) => {
        handlers.set(channel, listener);
      },
    };

    bootstrap.ipcRegistry.registerAll(ipcMain);

    expect(handlers.has(healthCheckContract.channel)).toBe(true);
    expect(handlers.has(listBrokersContract.channel)).toBe(true);
    expect(handlers.has(listAssetsContract.channel)).toBe(true);
    expect(handlers.has(previewImportTransactionsContract.channel)).toBe(true);
    expect(handlers.has(listPositionsContract.channel)).toBe(true);
    expect(handlers.has(generateAssetsReportContract.channel)).toBe(true);
  });
});
