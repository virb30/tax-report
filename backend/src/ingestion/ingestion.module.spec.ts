import { jest } from '@jest/globals';
import type { Request } from 'express';
import type { Knex } from 'knex';
import { mock, mockFn, mockReset } from 'jest-mock-extended';
import type { SharedInfrastructure } from '../shared/application/shared-infrastructure';
import type { AssetRepository } from '../portfolio/application/repositories/asset.repository';
import type { BrokerRepository } from '../portfolio/application/repositories/broker.repository';
import type { TransactionFeeRepository } from '../portfolio/application/repositories/transaction-fee.repository';
import type { TransactionRepository } from '../portfolio/application/repositories/transaction.repository';
import { Broker } from '../portfolio/domain/entities/broker.entity';
import { RecordingMemoryQueueAdapter } from '../shared/infra/events/recording-memory-queue.adapter';
import type { HttpRequest } from '../shared/infra/http/http.interface';
import { RecordingMemoryAdapterHttp } from '../shared/infra/http/recording-memory-adapter.http';
import { Cnpj } from '../shared/domain/value-objects/cnpj.vo';
import { Uuid } from '../shared/domain/value-objects/uuid.vo';
import { IngestionModule } from './ingestion.module';
import type { DeleteDailyBrokerTaxUseCase } from './application/use-cases/delete-daily-broker-tax.use-case';
import type { ImportConsolidatedPositionUseCase } from './application/use-cases/import-consolidated-position.use-case';
import type { ImportDailyBrokerTaxesUseCase } from './application/use-cases/import-daily-broker-taxes.use-case';
import type { ImportTransactionsUseCase } from './application/use-cases/import-transactions.use-case';
import type { ListDailyBrokerTaxesUseCase } from './application/use-cases/list-daily-broker-taxes.use-case';
import type { PreviewImportUseCase } from './application/use-cases/preview-import.use-case';
import type { SaveDailyBrokerTaxUseCase } from './application/use-cases/save-daily-broker-tax.use-case';
import type { DailyBrokerTaxRow } from './infra/repositories/knex-daily-broker-tax.repository';
import { KnexDailyBrokerTaxRepository } from './infra/repositories/knex-daily-broker-tax.repository';
import { consolidatedPositionUploadMiddleware } from './transport/http/middleware/consolidated-position-upload.middleware';
import { dailyBrokerTaxUploadMiddleware } from './transport/http/middleware/daily-broker-tax-upload.middleware';
import { transactionUploadMiddleware } from './transport/http/middleware/transaction-upload.middleware';

type ModuleAccess = {
  useCases: {
    listDailyBrokerTaxesUseCase: {
      execute(): Promise<unknown>;
    };
  };
};

const BROKER_ID = Uuid.create().value;

function createRequest(input: Partial<HttpRequest> = {}): HttpRequest {
  return {
    params: {},
    query: {},
    body: {},
    raw: {} as Request,
    ...input,
  };
}

const mockBrokerRepository = mock<BrokerRepository>();
const mockAssetRepository = mock<AssetRepository>();
const mockTransactionRepository = mock<TransactionRepository>();
const mockTransactionFeeRepository = mock<TransactionFeeRepository>();

function createPortfolioDependencies() {
  return {
    brokerRepository: mockBrokerRepository,
    assetRepository: mockAssetRepository,
    transactionRepository: mockTransactionRepository,
    transactionFeeRepository: mockTransactionFeeRepository,
  };
}

function createShared(database: Knex = jest.fn() as unknown as Knex): SharedInfrastructure {
  return {
    database,
    queue: new RecordingMemoryQueueAdapter(),
  };
}

function createDailyBrokerTaxesDatabase(): Knex {
  const rows: DailyBrokerTaxRow[] = [
    {
      date: '2026-01-02',
      broker_id: BROKER_ID,
      fees: '12.34',
      irrf: '1.23',
    },
  ];

  const database = mockFn<(table: string) => unknown>().mockImplementation((table: string) => {
    expect(table).toBe('daily_broker_taxes');
    return {
      select: () => ({
        orderBy: () => ({
          orderBy: () => rows,
        }),
      }),
    };
  });

  return database as unknown as Knex;
}

describe('IngestionModule', () => {
  beforeEach(() => {
    mockReset(mockBrokerRepository);
    mockReset(mockTransactionFeeRepository);
    mockReset(mockTransactionRepository);
    mockReset(mockAssetRepository);
    mockBrokerRepository.findAll.mockResolvedValue([]);
    mockBrokerRepository.findAllByCodes.mockResolvedValue([]);
    mockAssetRepository.findByTickersList.mockResolvedValue([]);
  });

  it('exposes only the downstream repository contract', () => {
    const module = new IngestionModule({
      shared: createShared(),
      portfolio: createPortfolioDependencies(),
    });

    expect(Object.keys(module.exports)).toEqual(['dailyBrokerTaxRepository']);
    expect(module.exports.dailyBrokerTaxRepository).toBeInstanceOf(KnexDailyBrokerTaxRepository);
  });

  it('registers ingestion HTTP routes when instantiated with an Http adapter', () => {
    const http = new RecordingMemoryAdapterHttp();

    new IngestionModule({
      shared: createShared(),
      portfolio: createPortfolioDependencies(),
      http,
    });

    expect(http.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'post /api/transactions/import:preview',
      'post /api/transactions/import:confirm',
      'get /api/daily-broker-taxes',
      'post /api/daily-broker-taxes',
      'post /api/daily-broker-taxes/import',
      'delete /api/daily-broker-taxes/{date}/{brokerId}',
      'post /api/positions/consolidated-preview',
      'post /api/positions/consolidated-import',
    ]);
    expect(http.routes[0].middlewares).toEqual([transactionUploadMiddleware]);
    expect(http.routes[1].middlewares).toEqual([transactionUploadMiddleware]);
    expect(http.routes[4].middlewares).toEqual([dailyBrokerTaxUploadMiddleware]);
    expect(http.routes[6].middlewares).toEqual([consolidatedPositionUploadMiddleware]);
    expect(http.routes[7].middlewares).toEqual([consolidatedPositionUploadMiddleware]);
  });

  it('delegates controller validation to the wired ingestion use cases', async () => {
    const http = new RecordingMemoryAdapterHttp();
    const previewImportUseCase = mock<PreviewImportUseCase>();
    const importTransactionsUseCase = mock<ImportTransactionsUseCase>();
    const listDailyBrokerTaxesUseCase = mock<ListDailyBrokerTaxesUseCase>();
    const saveDailyBrokerTaxUseCase = mock<SaveDailyBrokerTaxUseCase>();
    const importDailyBrokerTaxesUseCase = mock<ImportDailyBrokerTaxesUseCase>();
    const deleteDailyBrokerTaxUseCase = mock<DeleteDailyBrokerTaxUseCase>();
    const importConsolidatedPositionUseCase = mock<ImportConsolidatedPositionUseCase>();

    saveDailyBrokerTaxUseCase.execute.mockResolvedValue({} as never);
    deleteDailyBrokerTaxUseCase.execute.mockResolvedValue({} as never);
    importTransactionsUseCase.execute.mockResolvedValue({} as never);
    importConsolidatedPositionUseCase.execute.mockResolvedValue({} as never);

    new IngestionModule({
      shared: createShared(),
      portfolio: createPortfolioDependencies(),
      http,
      overrides: {
        useCases: {
          previewImportUseCase,
          importTransactionsUseCase,
          listDailyBrokerTaxesUseCase,
          saveDailyBrokerTaxUseCase,
          importDailyBrokerTaxesUseCase,
          deleteDailyBrokerTaxUseCase,
          importConsolidatedPositionUseCase,
        },
      },
    });

    await http.routes[1].handler(
      createRequest({
        raw: { file: { path: '/tmp/transactions.csv' } } as Request,
        body: {
          assetTypeOverrides: JSON.stringify([{ ticker: 'ABCD3', assetType: 'stock' }]),
        },
      }),
    );
    expect(importTransactionsUseCase.execute).toHaveBeenCalledWith({
      filePath: '/tmp/transactions.csv',
      assetTypeOverrides: [{ ticker: 'ABCD3', assetType: 'stock' }],
    });

    await http.routes[3].handler(
      createRequest({
        body: {
          date: '2026-01-02',
          brokerId: 'broker-id',
          fees: 12.34,
          irrf: 1.23,
        },
      }),
    );
    expect(saveDailyBrokerTaxUseCase.execute).toHaveBeenCalledWith({
      date: '2026-01-02',
      brokerId: 'broker-id',
      fees: 12.34,
      irrf: 1.23,
    });

    await http.routes[5].handler(
      createRequest({
        params: { date: '2026-01-02', brokerId: 'broker-id' },
      }),
    );
    expect(deleteDailyBrokerTaxUseCase.execute).toHaveBeenCalledWith({
      date: '2026-01-02',
      brokerId: 'broker-id',
    });

    await http.routes[7].handler(
      createRequest({
        raw: { file: { path: '/tmp/positions.csv' } } as Request,
        body: {
          year: '2025',
          assetTypeOverrides: JSON.stringify([{ ticker: 'ABCD3', assetType: 'stock' }]),
        },
      }),
    );
    expect(importConsolidatedPositionUseCase.execute).toHaveBeenCalledWith({
      filePath: '/tmp/positions.csv',
      year: 2025,
      assetTypeOverrides: [{ ticker: 'ABCD3', assetType: 'stock' }],
    });
  });

  it('uses only the portfolio exports required by ingestion flows', () => {
    const portfolio = createPortfolioDependencies() as ReturnType<
      typeof createPortfolioDependencies
    > & {
      positionRepository: never;
    };
    Object.defineProperty(portfolio, 'positionRepository', {
      get: () => {
        throw new Error('positionRepository should not be consumed by ingestion composition.');
      },
    });

    expect(
      () =>
        new IngestionModule({
          shared: createShared(),
          portfolio,
        }),
    ).not.toThrow();
  });

  it('serves daily broker tax queries from shared infrastructure plus portfolio exports', async () => {
    mockBrokerRepository.findAll.mockResolvedValue([
      Broker.restore({
        id: Uuid.from(BROKER_ID),
        code: 'XP',
        name: 'XP Investimentos',
        cnpj: new Cnpj('27270525884131'),
      }),
    ]);

    const module = new IngestionModule({
      shared: createShared(createDailyBrokerTaxesDatabase()),
      portfolio: {
        ...createPortfolioDependencies(),
        brokerRepository: mockBrokerRepository,
      },
    }) as unknown as ModuleAccess;

    await expect(module.useCases.listDailyBrokerTaxesUseCase.execute()).resolves.toEqual({
      items: [
        {
          date: '2026-01-02',
          brokerId: BROKER_ID,
          brokerCode: 'XP',
          brokerName: 'XP Investimentos',
          fees: 12.34,
          irrf: 1.23,
        },
      ],
    });
  });
});
