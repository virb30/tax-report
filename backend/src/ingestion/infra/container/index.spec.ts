import { jest } from '@jest/globals';
import type { Knex } from 'knex';
import { mock, mockFn, mockReset } from 'jest-mock-extended';
import type {
  IngestionModule,
  IngestionPortfolioDependencies,
  SharedInfrastructure,
} from '../../../app/infra/container';
import type { AssetRepository } from '../../../portfolio/application/repositories/asset.repository';
import type { BrokerRepository } from '../../../portfolio/application/repositories/broker.repository';
import type { TransactionFeeRepository } from '../../../portfolio/application/repositories/transaction-fee.repository';
import type { TransactionRepository } from '../../../portfolio/application/repositories/transaction.repository';
import { Broker } from '../../../portfolio/domain/entities/broker.entity';
import { TransactionFeeAllocator } from '../../../portfolio/domain/services/transaction-fee-allocator.service';
import type { Queue } from '../../../shared/application/events/queue.interface';
import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { CsvXlsxConsolidatedPositionParser } from '../parsers/csv-xlsx-consolidated-position.parser';
import { CsvXlsxDailyBrokerTaxParser } from '../parsers/csv-xlsx-daily-broker-tax.parser';
import { CsvXlsxTransactionParser } from '../parsers/csv-xlsx-transaction.parser';
import type { DailyBrokerTaxRow } from '../repositories/knex-daily-broker-tax.repository';
import { KnexDailyBrokerTaxRepository } from '../repositories/knex-daily-broker-tax.repository';
import { createIngestionModule } from './index';

type PrivateFields = Record<string, unknown>;

const BROKER_ID = Uuid.create().value;

class RecordingQueue implements Queue {
  readonly publishedEvents: unknown[] = [];

  publish(event: unknown): Promise<void> {
    this.publishedEvents.push(event);
    return Promise.resolve();
  }

  subscribe(): void {}
}

const mockBrokerRepository = mock<BrokerRepository>();
const mockAssetRepository = mock<AssetRepository>();
const mockTransactionRepository = mock<TransactionRepository>();
const mockTransactionFeeRepository = mock<TransactionFeeRepository>();

function createPortfolioDependencies(): IngestionPortfolioDependencies {
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
    queue: new RecordingQueue(),
    transactionFeeAllocator: new TransactionFeeAllocator(),
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

describe('createIngestionModule', () => {
  beforeEach(() => {
    mockReset(mockBrokerRepository);
    mockReset(mockTransactionFeeRepository);
    mockReset(mockTransactionRepository);
    mockReset(mockAssetRepository);
    mockBrokerRepository.findAll.mockResolvedValue([]);
    mockBrokerRepository.findAllByCodes.mockResolvedValue([]);
    mockAssetRepository.findByTickersList.mockResolvedValue([]);
  });

  it('creates the expected use cases without desktop transport registration', () => {
    const module = createIngestionModule({
      shared: createShared(),
      portfolio: createPortfolioDependencies(),
    });

    expect(Object.keys(module.useCases).sort()).toEqual([
      'deleteDailyBrokerTaxUseCase',
      'importConsolidatedPositionUseCase',
      'importDailyBrokerTaxesUseCase',
      'importTransactionsUseCase',
      'listDailyBrokerTaxesUseCase',
      'previewImportUseCase',
      'saveDailyBrokerTaxUseCase',
    ]);
    expect('registerIpc' in module).toBe(false);
    expect(module.repositories.dailyBrokerTaxRepository).toBeInstanceOf(
      KnexDailyBrokerTaxRepository,
    );
  });

  it('uses only the portfolio exports required by ingestion flows', () => {
    const portfolio = createPortfolioDependencies() as IngestionPortfolioDependencies & {
      positionRepository: never;
    };
    Object.defineProperty(portfolio, 'positionRepository', {
      get: () => {
        throw new Error('positionRepository should not be consumed by ingestion composition.');
      },
    });

    expect(() =>
      createIngestionModule({
        shared: createShared(),
        portfolio,
      }),
    ).not.toThrow();
  });

  it('wires parsers and services with the same collaborator instances used by production flows', () => {
    const shared = createShared();
    const portfolio = createPortfolioDependencies();

    const module = createIngestionModule({ shared, portfolio });
    const transactionParser = module.parsers.transactionParser as unknown as PrivateFields;
    const dailyBrokerTaxesParser = module.parsers
      .dailyBrokerTaxesParser as unknown as PrivateFields;
    const reallocateTransactionFeesService = module.services
      .reallocateTransactionFeesService as unknown as PrivateFields;

    expect(module.parsers.transactionParser).toBeInstanceOf(CsvXlsxTransactionParser);
    expect(module.parsers.dailyBrokerTaxesParser).toBeInstanceOf(CsvXlsxDailyBrokerTaxParser);
    expect(module.parsers.consolidatedPositionParser).toBeInstanceOf(
      CsvXlsxConsolidatedPositionParser,
    );
    expect(transactionParser.fileReader).toBe(module.parsers.spreadsheetFileReader);
    expect(transactionParser.brokerRepository).toBe(portfolio.brokerRepository);
    expect(dailyBrokerTaxesParser.fileReader).toBe(module.parsers.spreadsheetFileReader);
    expect(dailyBrokerTaxesParser.brokerRepository).toBe(portfolio.brokerRepository);
    expect(reallocateTransactionFeesService.dailyBrokerTaxRepository).toBe(
      module.repositories.dailyBrokerTaxRepository,
    );
    expect(reallocateTransactionFeesService.transactionRepository).toBe(
      portfolio.transactionRepository,
    );
    expect(reallocateTransactionFeesService.transactionFeeRepository).toBe(
      portfolio.transactionFeeRepository,
    );
    expect(reallocateTransactionFeesService.transactionFeeAllocator).toBe(
      shared.transactionFeeAllocator,
    );
  });

  it('serves import use cases from shared infrastructure plus portfolio exports', async () => {
    mockBrokerRepository.findAll.mockResolvedValue([
      Broker.restore({
        id: Uuid.from(BROKER_ID),
        code: 'XP',
        name: 'XP Investimentos',
        cnpj: new Cnpj('27270525884131'),
      }),
    ]);

    const module = createIngestionModule({
      shared: createShared(createDailyBrokerTaxesDatabase()),
      portfolio: {
        ...createPortfolioDependencies(),
        brokerRepository: mockBrokerRepository,
      },
    });

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

  it('exposes the explicitly composed dependencies needed by downstream flows', () => {
    const module: IngestionModule = createIngestionModule({
      shared: createShared(),
      portfolio: createPortfolioDependencies(),
    });

    expect(module.repositories.dailyBrokerTaxRepository).toBeInstanceOf(
      KnexDailyBrokerTaxRepository,
    );
    expect(module.parsers.transactionParser).toBeInstanceOf(CsvXlsxTransactionParser);
    expect(module.parsers.dailyBrokerTaxesParser).toBeInstanceOf(CsvXlsxDailyBrokerTaxParser);
    expect(module.parsers.consolidatedPositionParser).toBeInstanceOf(
      CsvXlsxConsolidatedPositionParser,
    );
    expect(module.services.reallocateTransactionFeesService).toBeDefined();
    expect(module.useCases.importConsolidatedPositionUseCase).toBeDefined();
  });
});
