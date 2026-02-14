import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AssetType, SourceType, TransactionType } from '../../../shared/types/domain';
import type { BrokerRepositoryPort } from '../repositories/broker.repository';
import type { PositionRepository } from '../repositories/position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { GenerateAssetsReportUseCase } from './generate-assets-report-use-case';
import { ReportGenerator } from '../../domain/tax-reporting/report-generator.service';

function createTransaction(overrides: Partial<{
  id: string;
  date: string;
  type: TransactionType;
  ticker: string;
  quantity: number;
  unitPrice: number;
  fees: number;
  brokerId: string;
  sourceType: SourceType;
}> = {}) {
  return {
    id: 'tx-1',
    date: '2025-01-01',
    type: TransactionType.Buy,
    ticker: 'PETR4',
    quantity: 10,
    unitPrice: 20,
    fees: 0,
    brokerId: 'broker-xp',
    sourceType: SourceType.Csv,
    ...overrides,
  };
}

describe('GenerateAssetsReportUseCase', () => {
  let transactionRepository: jest.Mocked<TransactionRepository>;
  let positionRepository: jest.Mocked<PositionRepository>;
  let brokerRepository: jest.Mocked<BrokerRepositoryPort>;
  let reportGenerator: ReportGenerator;
  let useCase: GenerateAssetsReportUseCase;

  beforeEach(() => {
    const findByPeriodMock = jest.fn().mockResolvedValue([
      createTransaction({ ticker: 'PETR4', date: '2025-01-01', quantity: 10, unitPrice: 20 }),
      createTransaction({ ticker: 'HGLG11', date: '2025-01-02', quantity: 1, unitPrice: 150 }),
      createTransaction({ ticker: 'IVVB11', date: '2025-01-03', quantity: 5, unitPrice: 300 }),
      createTransaction({ ticker: 'AAPL34', date: '2025-01-04', quantity: 2, unitPrice: 40 }),
    ]);
    transactionRepository = {
      save: jest.fn(),
      saveMany: jest.fn(),
      findByTicker: jest.fn(),
      findByPeriod: findByPeriodMock,
      findExistingExternalRefs: jest.fn(),
    };
    positionRepository = {
      findByTicker: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      save: jest.fn(),
    };
    brokerRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn().mockResolvedValue([
        { id: 'broker-xp', name: 'XP Investimentos', cnpj: '02.332.886/0001-04' },
      ]),
      save: jest.fn(),
    };
    reportGenerator = new ReportGenerator();
    useCase = new GenerateAssetsReportUseCase(
      transactionRepository,
      positionRepository,
      brokerRepository,
      reportGenerator,
    );
  });

  it('generates annual report with positions reconstructed from transactions', async () => {
    const result = await useCase.execute({ baseYear: 2025 });

    expect(transactionRepository.findByPeriod).toHaveBeenCalledWith({
      startDate: '0000-01-01',
      endDate: '2025-12-31',
    });
    expect(result.referenceDate).toBe('2025-12-31');
    expect(result.items.length).toBeGreaterThanOrEqual(4);

    const petr4 = result.items.find((i) => i.ticker === 'PETR4');
    expect(petr4).toBeDefined();
    expect(petr4?.assetType).toBe(AssetType.Stock);
    expect(petr4?.totalQuantity).toBe(10);
    expect(petr4?.averagePrice).toBe(20);
    expect(petr4?.totalCost).toBe(200);
    expect(petr4?.revenueClassification).toEqual({ group: '03', code: '01' });
    expect(petr4?.allocations).toHaveLength(1);
    expect(petr4?.allocations[0]).toMatchObject({
      brokerName: 'XP Investimentos',
      cnpj: '02.332.886/0001-04',
      quantity: 10,
      totalCost: 200,
    });
  });

  it('returns empty report when no transactions', async () => {
    jest.spyOn(transactionRepository, 'findByPeriod').mockResolvedValue([]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items).toHaveLength(0);
  });

  it('excludes positions zeroed by sells', async () => {
    jest.spyOn(transactionRepository, 'findByPeriod').mockResolvedValue([
      createTransaction({ ticker: 'ABEV3', type: TransactionType.Buy, quantity: 10, unitPrice: 12 }),
      createTransaction({ ticker: 'ABEV3', type: TransactionType.Sell, quantity: 10, unitPrice: 0, date: '2025-06-01' }),
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items.find((i) => i.ticker === 'ABEV3')).toBeUndefined();
  });

  it('uses existing position for assetType when available', async () => {
    jest.spyOn(transactionRepository, 'findByPeriod').mockResolvedValue([
      createTransaction({ ticker: 'VALE3', quantity: 1, unitPrice: 10 }),
    ]);
    jest.spyOn(positionRepository, 'findByTicker').mockResolvedValue({
      ticker: 'VALE3',
      assetType: AssetType.Stock,
      totalQuantity: 0,
      averagePrice: 0,
      brokerBreakdown: [],
    });

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items.find((i) => i.ticker === 'VALE3')?.assetType).toBe(AssetType.Stock);
  });

  it('defaults to stock when position not found for ticker', async () => {
    jest.spyOn(transactionRepository, 'findByPeriod').mockResolvedValue([
      createTransaction({ ticker: 'NEWTICKER', quantity: 1, unitPrice: 100 }),
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items.find((i) => i.ticker === 'NEWTICKER')?.assetType).toBe(AssetType.Stock);
  });

  it('handles InitialBalance transaction type', async () => {
    jest.spyOn(transactionRepository, 'findByPeriod').mockResolvedValue([
      createTransaction({
        ticker: 'KNRI11',
        type: TransactionType.InitialBalance,
        quantity: 3,
        unitPrice: 100,
        fees: 0,
      }),
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    const knri = result.items.find((i) => i.ticker === 'KNRI11');
    expect(knri).toBeDefined();
    expect(knri?.totalQuantity).toBe(3);
    expect(knri?.averagePrice).toBe(100);
    expect(knri?.assetType).toBe(AssetType.Stock);
  });

  it('handles multi-broker position with correct allocations', async () => {
    jest.spyOn(transactionRepository, 'findByPeriod').mockResolvedValue([
      createTransaction({ ticker: 'PETR4', brokerId: 'broker-xp', quantity: 100, unitPrice: 35.2 }),
      createTransaction({ ticker: 'PETR4', brokerId: 'broker-clear', quantity: 50, unitPrice: 35.2, date: '2025-02-01' }),
    ]);
    jest.spyOn(brokerRepository, 'findAll').mockResolvedValue([
      { id: 'broker-xp', name: 'XP Investimentos', cnpj: '02.332.886/0001-04' },
      { id: 'broker-clear', name: 'Clear Corretora', cnpj: '02.332.886/0011-78' },
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    const petr4 = result.items.find((i) => i.ticker === 'PETR4');
    expect(petr4?.totalQuantity).toBe(150);
    expect(petr4?.allocations).toHaveLength(2);
    expect(petr4?.allocations.map((a) => a.brokerName)).toEqual(
      expect.arrayContaining(['XP Investimentos', 'Clear Corretora']),
    );
  });
});
