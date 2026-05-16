import type { Request } from 'express';
import type { Knex } from 'knex';
import { mock } from 'jest-mock-extended';
import type { TaxReportingPortfolioDependencies } from './tax-reporting.module';
import type { AssetPositionRepository } from '../portfolio/application/repositories/asset-position.repository';
import type { AssetRepository } from '../portfolio/application/repositories/asset.repository';
import type { BrokerRepository } from '../portfolio/application/repositories/broker.repository';
import type { TransactionRepository } from '../portfolio/application/repositories/transaction.repository';
import type { SharedInfrastructure } from '../shared/application/shared-infrastructure';
import { AssetTaxClassificationChangedEvent } from '../shared/domain/events/asset-tax-classification-changed.event';
import { ConsolidatedPositionImportedEvent } from '../shared/domain/events/consolidated-position-imported.event';
import { TransactionFeesReallocatedEvent } from '../shared/domain/events/transaction-fees-reallocated.event';
import { TransactionsImportedEvent } from '../shared/domain/events/transactions-imported.event';
import { MemoryQueueAdapter } from '../shared/infra/events/memory-queue.adapter';
import type { HttpRequest } from '../shared/infra/http/http.interface';
import { RecordingMemoryAdapterHttp } from '../shared/infra/http/recording-memory-adapter.http';
import { TaxReportingModule } from './tax-reporting.module';
import type { GenerateAssetsReportUseCase } from './application/use-cases/generate-assets-report.use-case';
import type { GetMonthlyTaxDetailUseCase } from './application/use-cases/get-monthly-tax-detail.use-case';
import type { ListMonthlyTaxHistoryUseCase } from './application/use-cases/list-monthly-tax-history.use-case';
import type { RecalculateMonthlyTaxHistoryUseCase } from './application/use-cases/recalculate-monthly-tax-history.use-case';
import { KnexMonthlyTaxCloseRepository } from './infra/repositories/knex-monthly-tax-close.repository';

type TaxReportingModuleAccess = {
  repositories: {
    monthlyTaxCloseRepository: KnexMonthlyTaxCloseRepository;
  };
  useCases: {
    generateAssetsReportUseCase: GenerateAssetsReportUseCase;
  };
};

function createRequest(input: Partial<HttpRequest> = {}): HttpRequest {
  return {
    params: {},
    query: {},
    body: {},
    raw: {} as Request,
    ...input,
  };
}

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
  };
}

function createIngestionExports() {
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

describe('TaxReportingModule', () => {
  it('exposes an empty public facade and keeps repositories internal', () => {
    const module = new TaxReportingModule({
      shared: createSharedInfrastructure(),
      portfolio: createPortfolioDependencies(),
      ingestion: createIngestionExports(),
    });
    const access = module as unknown as TaxReportingModuleAccess;

    expect(module.exports).toEqual({});
    expect(access.repositories.monthlyTaxCloseRepository).toBeInstanceOf(
      KnexMonthlyTaxCloseRepository,
    );
    expect(access.useCases.generateAssetsReportUseCase).toBeDefined();
  });

  it('registers monthly tax and report routes on construction', () => {
    const http = new RecordingMemoryAdapterHttp();

    new TaxReportingModule({
      shared: createSharedInfrastructure(),
      portfolio: createPortfolioDependencies(),
      ingestion: createIngestionExports(),
      http,
    });

    expect(http.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'get /api/monthly-tax/history',
      'get /api/monthly-tax/months/{month}',
      'post /api/monthly-tax/recalculate',
      'get /api/reports/assets',
    ]);
  });

  it('delegates validated monthly tax and report inputs to the wired use cases', async () => {
    const http = new RecordingMemoryAdapterHttp();
    const generateAssetsReportUseCase = mock<GenerateAssetsReportUseCase>();
    const listMonthlyTaxHistoryUseCase = mock<ListMonthlyTaxHistoryUseCase>();
    const getMonthlyTaxDetailUseCase = mock<GetMonthlyTaxDetailUseCase>();
    const recalculateMonthlyTaxHistoryUseCase = mock<RecalculateMonthlyTaxHistoryUseCase>();

    listMonthlyTaxHistoryUseCase.execute.mockResolvedValue({} as never);
    getMonthlyTaxDetailUseCase.execute.mockResolvedValue({} as never);
    recalculateMonthlyTaxHistoryUseCase.execute.mockResolvedValue({} as never);
    generateAssetsReportUseCase.execute.mockResolvedValue({} as never);

    new TaxReportingModule({
      shared: createSharedInfrastructure(),
      portfolio: createPortfolioDependencies(),
      ingestion: createIngestionExports(),
      http,
      overrides: {
        useCases: {
          generateAssetsReportUseCase,
          listMonthlyTaxHistoryUseCase,
          getMonthlyTaxDetailUseCase,
          recalculateMonthlyTaxHistoryUseCase,
        } as never,
      },
    });

    await http.routes[0].handler(createRequest({ query: { startYear: '2025' } }));
    expect(listMonthlyTaxHistoryUseCase.execute).toHaveBeenCalledWith({ startYear: 2025 });

    await http.routes[1].handler(createRequest({ params: { month: '2025-01' } }));
    expect(getMonthlyTaxDetailUseCase.execute).toHaveBeenCalledWith({ month: '2025-01' });

    await http.routes[2].handler(
      createRequest({
        body: { startYear: 2025, reason: 'manual' },
      }),
    );
    expect(recalculateMonthlyTaxHistoryUseCase.execute).toHaveBeenCalledWith({
      startYear: 2025,
      reason: 'manual',
    });

    await http.routes[3].handler(createRequest({ query: { baseYear: '2025' } }));
    expect(generateAssetsReportUseCase.execute).toHaveBeenCalledWith({ baseYear: 2025 });
  });

  it('subscribes to upstream recalculation events immediately in the constructor', () => {
    const shared = createSharedInfrastructure();
    const queue = shared.queue as MemoryQueueAdapter;

    new TaxReportingModule({
      shared,
      portfolio: createPortfolioDependencies(),
      ingestion: createIngestionExports(),
    });

    expect(queue.consumers.get(ConsolidatedPositionImportedEvent.name)).toHaveLength(1);
    expect(queue.consumers.get(TransactionsImportedEvent.name)).toHaveLength(1);
    expect(queue.consumers.get(TransactionFeesReallocatedEvent.name)).toHaveLength(1);
    expect(queue.consumers.get(AssetTaxClassificationChangedEvent.name)).toHaveLength(1);
  });
});
