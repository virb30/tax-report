import express, { type Express } from 'express';
import type { Knex } from 'knex';
import { createSharedInfrastructure } from '../app/infra/container';
import { createAndInitializeDatabase } from '../app/infra/database/database';
import { createIngestionModule } from '../ingestion/infra/container';
import { createPortfolioModule } from '../portfolio/infra/container';
import { createTaxReportingModule } from '../tax-reporting/infra/container';
import type {
  AppModule,
  BackendModule,
  IngestionModule,
  PortfolioModule,
  SharedInfrastructure,
  TaxReportingModule,
} from '../app/infra/container';
import { createAppModule } from '../app/infra/container';
import type { BackendRuntimeConfig } from '../app/infra/runtime/backend-runtime-config';
import { HttpError } from './errors/http-error';
import type { BackendLogger } from './logging/safe-error-logger';
import { correlationIdMiddleware } from './middleware/correlation-id.middleware';
import { createErrorMiddleware } from './middleware/error.middleware';
import { registerApiRoutes } from './routes';
import cors from 'cors';

export interface BackendModules {
  app: AppModule;
  portfolio: PortfolioModule;
  ingestion: IngestionModule;
  taxReporting: TaxReportingModule;
}

export interface BackendApp {
  app: Express;
  database: Knex;
  modules: BackendModules;
  config: BackendRuntimeConfig;
}

export interface BackendAppDependencies {
  initializeDatabase(config: BackendRuntimeConfig): Promise<Knex>;
  createSharedInfrastructure(database: Knex): SharedInfrastructure;
  createAppModule(): AppModule;
  createPortfolioModule(shared: SharedInfrastructure): PortfolioModule;
  createIngestionModule(input: {
    shared: SharedInfrastructure;
    portfolio: PortfolioModule['exports'];
  }): IngestionModule;
  createTaxReportingModule(input: {
    shared: SharedInfrastructure;
    portfolio: PortfolioModule['exports'];
    ingestion: IngestionModule['repositories'];
  }): TaxReportingModule;
  logger: BackendLogger;
}

export interface CreateBackendAppInput {
  config: BackendRuntimeConfig;
  dependencies?: Partial<BackendAppDependencies>;
}

const consoleLogger: BackendLogger = {
  error(metadata: Record<string, unknown>, message: string): void {
    console.error(message, metadata);
  },
};

async function initializeRuntimeDatabase(config: BackendRuntimeConfig): Promise<Knex> {
  const { database } = await createAndInitializeDatabase(config.database, true);
  return database;
}

function createDependencies(overrides: Partial<BackendAppDependencies>): BackendAppDependencies {
  return {
    initializeDatabase: initializeRuntimeDatabase,
    createSharedInfrastructure,
    createAppModule,
    createPortfolioModule,
    createIngestionModule,
    createTaxReportingModule,
    logger: consoleLogger,
    ...overrides,
  };
}

function initializeStartupHandlers(modules: readonly BackendModule[]): void {
  for (const module of modules) {
    module.startup?.initialize();
  }
}

function composeModules(input: {
  database: Knex;
  dependencies: BackendAppDependencies;
}): BackendModules {
  const { database, dependencies } = input;
  const shared = dependencies.createSharedInfrastructure(database);
  const appModule = dependencies.createAppModule();
  const portfolioModule = dependencies.createPortfolioModule(shared);
  const ingestionModule = dependencies.createIngestionModule({
    shared,
    portfolio: portfolioModule.exports,
  });
  const taxReportingModule = dependencies.createTaxReportingModule({
    shared,
    portfolio: portfolioModule.exports,
    ingestion: ingestionModule.repositories,
  });

  return {
    app: appModule,
    portfolio: portfolioModule,
    ingestion: ingestionModule,
    taxReporting: taxReportingModule,
  };
}

function registerRoutes(input: {
  app: Express;
  config: BackendRuntimeConfig;
  logger: BackendLogger;
  modules: BackendModules;
}): void {
  const { app, config, logger, modules } = input;
  const apiRouter = express.Router();

  app.use(express.json());
  app.use(cors());
  app.use(correlationIdMiddleware);
  registerApiRoutes(apiRouter, {
    config,
    useCases: {
      portfolio: modules.portfolio.useCases,
      ingestion: modules.ingestion.useCases,
      taxReporting: modules.taxReporting.useCases,
    },
  });
  app.use('/api', apiRouter);
  app.use((request, _response, next) => {
    next(new HttpError(404, 'NOT_FOUND', `Route not found: ${request.method} ${request.path}`));
  });
  app.use(createErrorMiddleware(logger));
}

export async function createBackendApp(input: CreateBackendAppInput): Promise<BackendApp> {
  const dependencies = createDependencies(input.dependencies ?? {});
  const database = await dependencies.initializeDatabase(input.config);
  const modules = composeModules({ database, dependencies });

  initializeStartupHandlers([
    modules.app,
    modules.portfolio,
    modules.ingestion,
    modules.taxReporting,
  ]);

  const app = express();
  registerRoutes({
    app,
    config: input.config,
    logger: dependencies.logger,
    modules,
  });

  return {
    app,
    database,
    modules,
    config: input.config,
  };
}
