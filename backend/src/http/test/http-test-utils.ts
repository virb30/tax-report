import type { Knex } from 'knex';
import type {
  BackendModule,
  IngestionModule,
  PortfolioModule,
  SharedInfrastructure,
  TaxReportingModule,
} from '../../app/infra/container';
import type { BackendRuntimeConfig } from '../../app/infra/runtime/backend-runtime-config';
import { MemoryQueueAdapter } from '../../shared/infra/events/memory-queue.adapter';
import { TransactionFeeAllocator } from '../../portfolio/domain/services/transaction-fee-allocator.service';
import type { BackendAppDependencies } from '../app';

type ExecuteMock = jest.Mock<Promise<unknown>, [unknown?]>;
type NoInputExecuteMock = jest.Mock<Promise<unknown>, []>;

function createModule(): BackendModule {
  return {
    startup: {
      initialize: jest.fn(),
    },
  };
}

function createExecuteMock(): ExecuteMock {
  return jest.fn<Promise<unknown>, [unknown?]>();
}

function createNoInputExecuteMock(): NoInputExecuteMock {
  return jest.fn<Promise<unknown>, []>();
}

export function createRuntimeConfig(
  input: { maxFileSizeBytes?: number } = {},
): BackendRuntimeConfig {
  return {
    environment: 'test',
    port: 3000,
    database: {
      sqlitePath: ':memory:',
    },
    uploads: {
      maxFileSizeBytes: input.maxFileSizeBytes ?? 1024 * 1024,
      maxFiles: 1,
    },
  };
}

export function createMockBackendDependencies() {
  const database = jest.fn() as unknown as Knex;
  const shared: SharedInfrastructure = {
    database,
    queue: new MemoryQueueAdapter(),
    transactionFeeAllocator: new TransactionFeeAllocator(),
  };
  const portfolioUseCases = {
    createBrokerUseCase: { execute: createExecuteMock() },
    listAssetsUseCase: { execute: createExecuteMock() },
    updateBrokerUseCase: { execute: createExecuteMock() },
    updateAssetUseCase: { execute: createExecuteMock() },
    listBrokersUseCase: { execute: createExecuteMock() },
    toggleActiveBrokerUseCase: { execute: createExecuteMock() },
    repairAssetTypeUseCase: { execute: createExecuteMock() },
    saveInitialBalanceDocumentUseCase: { execute: createExecuteMock() },
    listInitialBalanceDocumentsUseCase: { execute: createExecuteMock() },
    deleteInitialBalanceDocumentUseCase: { execute: createExecuteMock() },
    listPositionsUseCase: { execute: createExecuteMock() },
    recalculatePositionUseCase: { execute: createExecuteMock() },
    migrateYearUseCase: { execute: createExecuteMock() },
    importConsolidatedPositionUseCase: {
      execute: createExecuteMock(),
      preview: createExecuteMock(),
    },
    deletePositionUseCase: {
      execute: createExecuteMock(),
      executeAll: createExecuteMock(),
    },
  };
  const ingestionUseCases = {
    importTransactionsUseCase: { execute: createExecuteMock() },
    previewImportUseCase: { execute: createExecuteMock() },
    listDailyBrokerTaxesUseCase: { execute: createNoInputExecuteMock() },
    saveDailyBrokerTaxUseCase: { execute: createExecuteMock() },
    importDailyBrokerTaxesUseCase: { execute: createExecuteMock() },
    deleteDailyBrokerTaxUseCase: { execute: createExecuteMock() },
    importConsolidatedPositionUseCase: { execute: createExecuteMock() },
  };
  const taxReportingUseCases = {
    generateAssetsReportUseCase: { execute: createExecuteMock() },
    listMonthlyTaxHistoryUseCase: { execute: createExecuteMock() },
    getMonthlyTaxDetailUseCase: { execute: createExecuteMock() },
    recalculateMonthlyTaxHistoryUseCase: { execute: createExecuteMock() },
  };
  const portfolioModule = {
    ...createModule(),
    exports: {},
    useCases: portfolioUseCases,
  } as unknown as PortfolioModule;
  const ingestionModule = {
    ...createModule(),
    repositories: {},
    parsers: {},
    services: {},
    useCases: ingestionUseCases,
  } as unknown as IngestionModule;
  const taxReportingModule = {
    ...createModule(),
    repositories: {},
    useCases: taxReportingUseCases,
  } as unknown as TaxReportingModule;
  const dependencies: BackendAppDependencies = {
    initializeDatabase: jest.fn().mockResolvedValue(database),
    createSharedInfrastructure: jest.fn().mockReturnValue(shared),
    createAppModule: jest.fn().mockReturnValue(createModule()),
    createPortfolioModule: jest.fn().mockReturnValue(portfolioModule),
    createIngestionModule: jest.fn().mockReturnValue(ingestionModule),
    createTaxReportingModule: jest.fn().mockReturnValue(taxReportingModule),
    logger: {
      error: jest.fn(),
    },
  };

  return {
    dependencies,
    useCases: {
      portfolio: portfolioUseCases,
      ingestion: ingestionUseCases,
      taxReporting: taxReportingUseCases,
    },
  };
}
