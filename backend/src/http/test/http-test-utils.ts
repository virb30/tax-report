import type { Knex } from 'knex';
import type { BackendRuntimeConfig } from '../../app/infra/runtime/backend-runtime-config';
import { IngestionModule as IngestionContextModule } from '../../ingestion/ingestion.module';
import { PortfolioModule as PortfolioContextModule } from '../../portfolio/portfolio.module';
import { TaxReportingModule as TaxReportingContextModule } from '../../tax-reporting/tax-reporting.module';
import {
  createSharedInfrastructure,
  type SharedInfrastructure,
} from '../../shared/application/shared-infrastructure';
import type { BackendAppDependencies } from '../app';

type ExecuteMock = jest.Mock<Promise<unknown>, [unknown?]>;
type NoInputExecuteMock = jest.Mock<Promise<unknown>, []>;

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
  const shared: SharedInfrastructure = createSharedInfrastructure(database);
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
    deletePositionUseCase: { execute: createExecuteMock() },
    deleteAllPositionsUseCase: { execute: createExecuteMock() },
  };
  const ingestionUseCases = {
    importTransactionsUseCase: { execute: createExecuteMock() },
    previewImportUseCase: { execute: createExecuteMock() },
    listDailyBrokerTaxesUseCase: { execute: createNoInputExecuteMock() },
    saveDailyBrokerTaxUseCase: { execute: createExecuteMock() },
    importDailyBrokerTaxesUseCase: { execute: createExecuteMock() },
    deleteDailyBrokerTaxUseCase: { execute: createExecuteMock() },
    importConsolidatedPositionUseCase: {
      execute: createExecuteMock(),
      preview: createExecuteMock(),
    },
  };
  const taxReportingUseCases = {
    generateAssetsReportUseCase: { execute: createExecuteMock() },
    listMonthlyTaxHistoryUseCase: { execute: createExecuteMock() },
    getMonthlyTaxDetailUseCase: { execute: createExecuteMock() },
    recalculateMonthlyTaxHistoryUseCase: { execute: createExecuteMock() },
  };
  const dependencies: BackendAppDependencies = {
    initializeDatabase: jest.fn().mockResolvedValue(database),
    createSharedInfrastructure: jest.fn().mockReturnValue(shared),
    createPortfolioModule: jest
      .fn()
      .mockImplementation(
        (input: Parameters<BackendAppDependencies['createPortfolioModule']>[0]) => {
          return new PortfolioContextModule({
            ...input,
            overrides: {
              // Test helpers intentionally inject jest mocks into the module internals.
              useCases: portfolioUseCases as never,
            },
          });
        },
      ),
    createIngestionModule: jest
      .fn()
      .mockImplementation(
        (input: Parameters<BackendAppDependencies['createIngestionModule']>[0]) => {
          return new IngestionContextModule({
            ...input,
            overrides: {
              useCases: ingestionUseCases as never,
            },
          });
        },
      ),
    createTaxReportingModule: jest
      .fn()
      .mockImplementation(
        (input: Parameters<BackendAppDependencies['createTaxReportingModule']>[0]) => {
          return new TaxReportingContextModule({
            ...input,
            overrides: {
              useCases: taxReportingUseCases as never,
            },
          });
        },
      ),
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
