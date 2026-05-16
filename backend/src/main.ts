import type { BackendRuntimeConfig } from './app/infra/runtime/backend-runtime-config';
import type { Knex } from 'knex';
import type { Express } from 'express';
import { createAndInitializeDatabase } from './app/infra/database/database';
import { createBackendRuntimeConfig } from './app/infra/runtime/backend-runtime-config';
import { loadBackendEnvironment } from './app/infra/runtime/load-backend-environment';
import { createHttpApp, registerCoreRoutes, type HttpApp } from './http/app';
import { IngestionModule, type IngestionModuleInput } from './ingestion/ingestion.module';
import { PortfolioModule, type PortfolioModuleInput } from './portfolio/portfolio.module';
import {
  createSharedInfrastructure,
  type SharedInfrastructure,
} from './shared/application/shared-infrastructure';
import type { Http } from './shared/infra/http/http.interface';
import {
  TaxReportingModule,
  type TaxReportingModuleInput,
} from './tax-reporting/tax-reporting.module';

export interface RuntimeBackend {
  app: Express;
  http: Http;
  database: Knex;
  config: BackendRuntimeConfig;
  modules: {
    portfolio: PortfolioModule;
    ingestion: IngestionModule;
    taxReporting: TaxReportingModule;
  };
}

export interface StartBackendDependencies {
  loadBackendEnvironment(): void;
  createBackendRuntimeConfig(): BackendRuntimeConfig;
  createAndInitializeDatabase: typeof createAndInitializeDatabase;
  createSharedInfrastructure(database: Knex): SharedInfrastructure;
  createHttpApp(input: { config: BackendRuntimeConfig }): HttpApp;
  registerCoreRoutes(input: {
    app: Express;
    logger: { error(metadata: Record<string, unknown>, message: string): void };
  }): void;
  createPortfolioModule(input: PortfolioModuleInput): PortfolioModule;
  createIngestionModule(input: IngestionModuleInput): IngestionModule;
  createTaxReportingModule(input: TaxReportingModuleInput): TaxReportingModule;
}

function createDependencies(
  overrides: Partial<StartBackendDependencies> = {},
): StartBackendDependencies {
  return {
    loadBackendEnvironment,
    createBackendRuntimeConfig,
    createAndInitializeDatabase,
    createSharedInfrastructure,
    createHttpApp,
    registerCoreRoutes,
    createPortfolioModule: (input) => new PortfolioModule(input),
    createIngestionModule: (input) => new IngestionModule(input),
    createTaxReportingModule: (input) => new TaxReportingModule(input),
    ...overrides,
  };
}

export async function startBackend(
  overrides: Partial<StartBackendDependencies> = {},
): Promise<RuntimeBackend> {
  const dependencies = createDependencies(overrides);

  dependencies.loadBackendEnvironment();
  const config = dependencies.createBackendRuntimeConfig();
  const { database } = await dependencies.createAndInitializeDatabase(config.database, true);
  const shared = dependencies.createSharedInfrastructure(database);
  const { app, http } = dependencies.createHttpApp({
    config,
  });
  const portfolio = dependencies.createPortfolioModule({
    shared,
    http,
  });
  const ingestion = dependencies.createIngestionModule({
    shared,
    http,
    portfolio: portfolio.exports,
  });
  const taxReporting = dependencies.createTaxReportingModule({
    shared,
    http,
    portfolio: portfolio.exports,
    ingestion: ingestion.exports,
  });
  dependencies.registerCoreRoutes({
    app,
    logger: {
      error(metadata: Record<string, unknown>, message: string): void {
        console.error(message, metadata);
      },
    },
  });

  return {
    app,
    http,
    database,
    config,
    modules: {
      portfolio,
      ingestion,
      taxReporting,
    },
  };
}

async function bootstrap(): Promise<void> {
  const backend = await startBackend();
  backend.http.listen(backend.config.port, () => {
    console.log(`Tax Report backend listening on port ${backend.config.port}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  void bootstrap().catch((error: unknown) => {
    console.error('Failed to start Tax Report backend', error);
    process.exitCode = 1;
  });
}
