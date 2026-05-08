import type { Knex } from 'knex';
import { healthCheckContract } from '../../../../ipc/contracts/app';
import { previewImportTransactionsContract } from '../../../../ipc/contracts/ingestion/import';
import { listAssetsContract } from '../../../../ipc/contracts/portfolio/assets';
import { listBrokersContract } from '../../../../ipc/contracts/portfolio/brokers';
import { listPositionsContract } from '../../../../ipc/contracts/portfolio/portfolio';
import { generateAssetsReportContract } from '../../../../ipc/contracts/tax-reporting/report';
import type { IpcMainHandleRegistry } from '../../../../ipc/main/binding/ipc-main-handle-registry';
import { createIngestionModule } from '../../../ingestion/infra/container';
import { createPortfolioModule } from '../../../portfolio/infra/container';
import { createTaxReportingModule } from '../../../tax-reporting/infra/container';
import { MemoryQueueAdapter } from '../../../shared/infra/events/memory-queue.adapter';
import { createAppModule } from './app-module';
import { createSharedInfrastructure } from './shared-infrastructure';

type IpcHandler = (_event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown;

function createIpcMain(): {
  ipcMain: IpcMainHandleRegistry;
  handlers: Map<string, IpcHandler>;
} {
  const handlers = new Map<string, IpcHandler>();

  return {
    handlers,
    ipcMain: {
      handle: (channel, listener) => {
        handlers.set(channel, listener);
      },
    },
  };
}

describe('main process module composition', () => {
  it('creates an app module that serves the health-check IPC contract directly', async () => {
    const { handlers, ipcMain } = createIpcMain();

    const module = createAppModule();
    module.registerIpc(ipcMain);

    const handler = handlers.get(healthCheckContract.channel);
    await expect(handler?.({} as Electron.IpcMainInvokeEvent)).resolves.toEqual({
      status: 'ok',
    });
    expect(module.startup).toBeUndefined();
  });

  it('creates shared infrastructure without registering an Awilix root container', () => {
    const database = jest.fn() as unknown as Knex;

    const shared = createSharedInfrastructure(database);

    expect(shared.database).toBe(database);
    expect(shared.queue).toBeInstanceOf(MemoryQueueAdapter);
    expect(shared.transactionFeeAllocator).toBeDefined();
  });

  it('composes modules in the runtime bootstrap order and registers IPC directly', () => {
    const shared = createSharedInfrastructure(jest.fn() as unknown as Knex);
    const appModule = createAppModule();
    const portfolioModule = createPortfolioModule(shared);
    const ingestionModule = createIngestionModule({
      shared,
      portfolio: portfolioModule.exports,
    });
    const taxReportingModule = createTaxReportingModule({
      shared,
      portfolio: portfolioModule.exports,
      ingestion: ingestionModule.repositories,
    });
    const modules = [appModule, portfolioModule, ingestionModule, taxReportingModule];
    const { handlers, ipcMain } = createIpcMain();

    for (const module of modules) {
      module.startup?.initialize();
    }
    for (const module of modules) {
      module.registerIpc(ipcMain);
    }

    expect(handlers.has(healthCheckContract.channel)).toBe(true);
    expect(handlers.has(listBrokersContract.channel)).toBe(true);
    expect(handlers.has(listAssetsContract.channel)).toBe(true);
    expect(handlers.has(previewImportTransactionsContract.channel)).toBe(true);
    expect(handlers.has(listPositionsContract.channel)).toBe(true);
    expect(handlers.has(generateAssetsReportContract.channel)).toBe(true);
  });
});
