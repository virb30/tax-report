import type { Knex } from 'knex';
import request from 'supertest';
import type { BackendRuntimeConfig } from '../app/infra/runtime/backend-runtime-config';
import type { PortfolioModule } from '../portfolio/portfolio.module';
import {
  createSharedInfrastructure,
  type SharedInfrastructure,
} from '../shared/application/shared-infrastructure';
import type { TaxReportingModule } from '../tax-reporting/tax-reporting.module';
import type { BackendAppDependencies } from './app';
import { createBackendApp } from './app';

function createConfig(): BackendRuntimeConfig {
  return {
    environment: 'test',
    port: 3000,
    database: {
      sqlitePath: ':memory:',
    },
    uploads: {
      maxFileSizeBytes: 1024,
      maxFiles: 1,
    },
  };
}

interface TestDependencies extends BackendAppDependencies {
  createdModules: unknown[];
}

function createDependencies(): TestDependencies {
  const database = jest.fn() as unknown as Knex;
  const createdModules: unknown[] = [];
  const shared: SharedInfrastructure = createSharedInfrastructure(database);
  const portfolioModule = {
    exports: {},
  } as unknown as PortfolioModule;
  const ingestionModule = {
    exports: {},
  };
  const taxReportingModule = {
    exports: {},
  } as unknown as TaxReportingModule;
  createdModules.push(portfolioModule, ingestionModule, taxReportingModule);

  return {
    initializeDatabase: jest.fn().mockResolvedValue(database),
    createSharedInfrastructure: jest.fn().mockReturnValue(shared),
    createPortfolioModule: jest.fn().mockReturnValue(portfolioModule),
    createIngestionModule: jest.fn().mockReturnValue(ingestionModule),
    createTaxReportingModule: jest.fn().mockReturnValue(taxReportingModule),
    logger: {
      error: jest.fn(),
    },
    createdModules,
  };
}

describe('createBackendApp', () => {
  it('serves GET /api/health without binding a network listener', async () => {
    const dependencies = createDependencies();
    const backend = await createBackendApp({
      config: createConfig(),
      dependencies,
    });

    const response = await request(backend.app)
      .get('/api/health')
      .set('x-correlation-id', 'test-correlation');

    expect(response.status).toBe(200);
    expect(response.headers['x-correlation-id']).toBe('test-correlation');
    expect(response.body).toEqual({
      status: 'ok',
    });
  });

  it('returns a consistent JSON error body for unknown routes', async () => {
    const dependencies = createDependencies();
    const backend = await createBackendApp({
      config: createConfig(),
      dependencies,
    });

    const response = await request(backend.app).get('/api/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found: GET /api/missing',
      },
    });
  });

  it('initializes the database and composes each context module once during app creation', async () => {
    const config = createConfig();
    const dependencies = createDependencies();

    await createBackendApp({
      config,
      dependencies,
    });

    expect(dependencies.initializeDatabase).toHaveBeenCalledTimes(1);
    expect(dependencies.initializeDatabase).toHaveBeenCalledWith(config);
    expect(dependencies.createSharedInfrastructure).toHaveBeenCalledTimes(1);
    expect(dependencies.createPortfolioModule).toHaveBeenCalledTimes(1);
    expect(dependencies.createIngestionModule).toHaveBeenCalledTimes(1);
    expect(dependencies.createTaxReportingModule).toHaveBeenCalledTimes(1);
    expect(dependencies.createdModules).toHaveLength(3);
  });
});
