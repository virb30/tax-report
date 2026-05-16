import type { Express } from 'express';
import type { Knex } from 'knex';
import { startBackend } from './main';
import type { IngestionModule } from './ingestion/ingestion.module';
import type { PortfolioModule } from './portfolio/portfolio.module';
import {
  createSharedInfrastructure,
  type SharedInfrastructure,
} from './shared/application/shared-infrastructure';
import type { Http } from './shared/infra/http/http.interface';
import type { TaxReportingModule } from './tax-reporting/tax-reporting.module';

describe('startBackend', () => {
  it('composes the runtime directly from shared infrastructure and module exports', async () => {
    const database = jest.fn() as unknown as Knex;
    const shared: SharedInfrastructure = createSharedInfrastructure(database);
    const app = {} as Express;
    const http = {
      on: jest.fn(),
      listen: jest.fn(),
    } as Http;
    const config = {
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
    const portfolioModule = {
      exports: {
        brokerRepository: { kind: 'broker-repository' },
        positionRepository: { kind: 'position-repository' },
        transactionRepository: { kind: 'transaction-repository' },
        transactionFeeRepository: { kind: 'transaction-fee-repository' },
        assetRepository: { kind: 'asset-repository' },
      },
    } as unknown as PortfolioModule;
    const ingestionModule = {
      exports: {
        dailyBrokerTaxRepository: { kind: 'daily-broker-tax-repository' },
      },
    } as unknown as IngestionModule;
    const taxReportingModule = {
      exports: {},
    } as TaxReportingModule;
    const dependencies = {
      loadBackendEnvironment: jest.fn(),
      createBackendRuntimeConfig: jest.fn().mockReturnValue(config),
      createAndInitializeDatabase: jest.fn().mockResolvedValue({
        database,
      }),
      createSharedInfrastructure: jest.fn().mockReturnValue(shared),
      createHttpApp: jest.fn().mockReturnValue({
        app,
        http,
      }),
      registerCoreRoutes: jest.fn(),
      createPortfolioModule: jest.fn().mockReturnValue(portfolioModule),
      createIngestionModule: jest.fn().mockReturnValue(ingestionModule),
      createTaxReportingModule: jest.fn().mockReturnValue(taxReportingModule),
    };

    const runtime = await startBackend(dependencies);

    expect(dependencies.loadBackendEnvironment).toHaveBeenCalledTimes(1);
    expect(dependencies.createBackendRuntimeConfig).toHaveBeenCalledTimes(1);
    expect(dependencies.createAndInitializeDatabase).toHaveBeenCalledWith(config.database, true);
    expect(dependencies.createSharedInfrastructure).toHaveBeenCalledWith(database);
    expect(dependencies.createHttpApp).toHaveBeenCalledWith({ config });
    expect(dependencies.registerCoreRoutes).toHaveBeenCalledWith({
      app,
      logger: expect.objectContaining({
        error: expect.any(Function),
      }),
    });
    expect(dependencies.createPortfolioModule).toHaveBeenCalledWith({
      shared,
      http,
    });
    expect(dependencies.createIngestionModule).toHaveBeenCalledWith({
      shared,
      http,
      portfolio: portfolioModule.exports,
    });
    expect(dependencies.createTaxReportingModule).toHaveBeenCalledWith({
      shared,
      http,
      portfolio: portfolioModule.exports,
      ingestion: ingestionModule.exports,
    });
    expect(runtime.modules).toEqual({
      portfolio: portfolioModule,
      ingestion: ingestionModule,
      taxReporting: taxReportingModule,
    });
    expect(http.listen).not.toHaveBeenCalled();
  });
});
