import express, { type Express } from 'express';
import type { Knex } from 'knex';
import type { BackendRuntimeConfig } from '../app/infra/runtime/backend-runtime-config';
import { createAndInitializeDatabase } from '../app/infra/database/database';
import { IngestionModule } from '../ingestion/ingestion.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import {
  createSharedInfrastructure,
  type SharedInfrastructure,
} from '../shared/application/shared-infrastructure';
import { ExpressAdapter } from '../shared/infra/http/express-adapter.http';
import type { Http } from '../shared/infra/http/http.interface';
import { TaxReportingModule } from '../tax-reporting/tax-reporting.module';
import { HttpError } from './errors/http-error';
import type { BackendLogger } from './logging/safe-error-logger';
import { createErrorMiddleware } from './middleware/error.middleware';

export interface BackendModules {
  portfolio: PortfolioModule;
  ingestion: IngestionModule;
  taxReporting: TaxReportingModule;
}

export interface HttpApp {
  app: Express;
  http: Http;
}

export interface BackendApp {
  app: Express;
  http: Http;
  database: Knex;
  modules: BackendModules;
  config: BackendRuntimeConfig;
}

export interface BackendAppDependencies {
  initializeDatabase(config: BackendRuntimeConfig): Promise<Knex>;
  createSharedInfrastructure(database: Knex): SharedInfrastructure;
  createPortfolioModule(input: { shared: SharedInfrastructure; http: Http }): PortfolioModule;
  createIngestionModule(input: {
    shared: SharedInfrastructure;
    http: Http;
    portfolio: PortfolioModule['exports'];
  }): IngestionModule;
  createTaxReportingModule(input: {
    shared: SharedInfrastructure;
    http: Http;
    portfolio: PortfolioModule['exports'];
    ingestion: IngestionModule['exports'];
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
    createPortfolioModule: (input) => new PortfolioModule(input),
    createIngestionModule: (input) => new IngestionModule(input),
    createTaxReportingModule: (input) => new TaxReportingModule(input),
    logger: consoleLogger,
    ...overrides,
  };
}

function composeModules(input: {
  database: Knex;
  dependencies: BackendAppDependencies;
  http: Http;
}): BackendModules {
  const { database, dependencies, http } = input;
  const shared = dependencies.createSharedInfrastructure(database);
  const portfolioModule = dependencies.createPortfolioModule({
    shared,
    http,
  });
  const ingestionModule = dependencies.createIngestionModule({
    shared,
    http,
    portfolio: portfolioModule.exports,
  });
  const taxReportingModule = dependencies.createTaxReportingModule({
    shared,
    http,
    portfolio: portfolioModule.exports,
    ingestion: ingestionModule.exports,
  });

  return {
    portfolio: portfolioModule,
    ingestion: ingestionModule,
    taxReporting: taxReportingModule,
  };
}

export function registerCoreRoutes(input: { app: Express; logger: BackendLogger }): void {
  const { app, logger } = input;
  app.get('/api/health', (_request, response) => {
    response.status(200).json({
      status: 'ok',
    });
  });
  app.use((request, _response, next) => {
    next(new HttpError(404, 'NOT_FOUND', `Route not found: ${request.method} ${request.path}`));
  });
  app.use(createErrorMiddleware(logger));
}

export function createHttpApp(input: { config: BackendRuntimeConfig; app?: Express }): HttpApp {
  const app = input.app ?? express();
  const http = new ExpressAdapter({
    app,
    config: input.config,
  });

  return {
    app,
    http,
  };
}

export async function createBackendApp(input: CreateBackendAppInput): Promise<BackendApp> {
  const dependencies = createDependencies(input.dependencies ?? {});
  const database = await dependencies.initializeDatabase(input.config);
  const { app, http } = createHttpApp({
    config: input.config,
  });

  const modules = composeModules({
    database,
    dependencies,
    http,
  });

  registerCoreRoutes({
    app,
    logger: dependencies.logger,
  });

  return {
    app,
    http,
    database,
    modules,
    config: input.config,
  };
}
