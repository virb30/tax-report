import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AssetType, OperationType, SourceType } from '../../../shared/types/domain';
import type { OperationRepositoryPort } from '../ports/operation-repository.port';
import type { PortfolioPositionRepositoryPort } from '../repositories/portfolio-position.repository.interface';
import { GenerateAssetsReportUseCase } from './generate-assets-report-use-case';

describe('GenerateAssetsReportUseCase', () => {
  let portfolioPositionRepository: PortfolioPositionRepositoryPort;
  let operationRepository: OperationRepositoryPort;
  let findAllMock: jest.Mock;
  let findByPeriodMock: jest.Mock;
  let useCase: GenerateAssetsReportUseCase;

  beforeEach(() => {
    findAllMock = jest.fn().mockResolvedValue([
      {
        ticker: 'PETR4',
        broker: 'XP',
        assetType: AssetType.Stock,
        quantity: 10,
        averagePrice: 20,
        isManualBase: false,
      },
      {
        ticker: 'HGLG11',
        broker: 'XP',
        assetType: AssetType.Fii,
        quantity: 0,
        averagePrice: 150,
        isManualBase: false,
      },
      {
        ticker: 'IVVB11',
        broker: 'XP',
        assetType: AssetType.Etf,
        quantity: 0,
        averagePrice: 0,
        isManualBase: false,
      },
      {
        ticker: 'AAPL34',
        broker: 'XP',
        assetType: AssetType.Bdr,
        quantity: 0,
        averagePrice: 0,
        isManualBase: false,
      },
    ]);
    portfolioPositionRepository = {
      findByTickerAndBroker: jest.fn(),
      findAll: findAllMock,
      save: jest.fn(),
    };
    findByPeriodMock = jest.fn().mockResolvedValue([
      {
        tradeDate: '2025-01-01',
        operationType: OperationType.Buy,
        ticker: 'PETR4',
        quantity: 10,
        unitPrice: 20,
        operationalCosts: 0,
        irrfWithheld: 0,
        broker: 'XP',
        sourceType: SourceType.Pdf,
        importedAt: '2025-01-01T00:00:00.000Z',
      },
      {
        tradeDate: '2025-01-02',
        operationType: OperationType.Buy,
        ticker: 'HGLG11',
        quantity: 1,
        unitPrice: 150,
        operationalCosts: 0,
        irrfWithheld: 0,
        broker: 'XP',
        sourceType: SourceType.Csv,
        importedAt: '2025-01-02T00:00:00.000Z',
      },
      {
        tradeDate: '2025-01-03',
        operationType: OperationType.Buy,
        ticker: 'IVVB11',
        quantity: 5,
        unitPrice: 300,
        operationalCosts: 0,
        irrfWithheld: 0,
        broker: 'XP',
        sourceType: SourceType.Pdf,
        importedAt: '2025-01-03T00:00:00.000Z',
      },
      {
        tradeDate: '2025-01-04',
        operationType: OperationType.Buy,
        ticker: 'AAPL34',
        quantity: 2,
        unitPrice: 40,
        operationalCosts: 0,
        irrfWithheld: 0,
        broker: 'XP',
        sourceType: SourceType.Pdf,
        importedAt: '2025-01-04T00:00:00.000Z',
      },
      {
        tradeDate: '2025-01-05',
        operationType: OperationType.Sell,
        ticker: 'ABEV3',
        quantity: 1,
        unitPrice: 12,
        operationalCosts: 0,
        irrfWithheld: 0,
        broker: 'XP',
        sourceType: SourceType.Manual,
        importedAt: '2025-01-05T00:00:00.000Z',
      },
    ]);
    operationRepository = {
      saveMany: jest.fn(),
      findByPeriod: findByPeriodMock,
    };
    useCase = new GenerateAssetsReportUseCase(portfolioPositionRepository, operationRepository);
  });

  it('generates annual report with positive positions and classifications', async () => {
    const result = await useCase.execute({ baseYear: 2025 });

    expect(findAllMock).toHaveBeenCalledTimes(1);
    expect(findByPeriodMock).toHaveBeenNthCalledWith(1, {
      startDate: '0000-01-01',
      endDate: '2025-12-31',
    });
    expect(findByPeriodMock).toHaveBeenNthCalledWith(2, {
      startDate: '0000-01-01',
      endDate: '9999-12-31',
    });
    expect(result.referenceDate).toBe('2025-12-31');
    expect(result.items).toHaveLength(4);
    expect(result.items[0]).toEqual({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
      name: null,
      cnpj: null,
      quantity: 10,
      averagePrice: 20,
      totalCost: 200,
      revenueClassification: { group: '03', code: '01' },
      description:
        '10 actions/units PETR4 - N/A. CNPJ: N/A. Broker: XP. Average cost: BRL 20.00. Total cost: BRL 200.00.',
    });
    expect(result.items[1]?.revenueClassification).toEqual({ group: '07', code: '03' });
    expect(result.items[2]?.revenueClassification).toEqual({ group: '07', code: '09' });
    expect(result.items[3]?.revenueClassification).toEqual({ group: '03', code: '01' });
  });

  it('throws when an unsupported asset type is received', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([
      {
        ticker: 'CRYPTO',
        broker: 'XP',
        assetType: 'crypto' as AssetType,
        quantity: 0,
        averagePrice: 0,
        isManualBase: false,
      },
    ]);
    jest.spyOn(operationRepository, 'findByPeriod').mockResolvedValue([
      {
        tradeDate: '2025-01-01',
        operationType: OperationType.Buy,
        ticker: 'CRYPTO',
        quantity: 1,
        unitPrice: 10,
        operationalCosts: 0,
        irrfWithheld: 0,
        broker: 'XP',
        sourceType: SourceType.Manual,
        importedAt: '2025-01-01T00:00:00.000Z',
      },
    ]);

    await expect(useCase.execute({ baseYear: 2025 })).rejects.toThrow(
      'Unsupported asset type for report: crypto',
    );
  });

  it('drops position to zero when sells exceed buys', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([]);
    jest.spyOn(operationRepository, 'findByPeriod').mockResolvedValue([
      {
        tradeDate: '2025-01-01',
        operationType: OperationType.Sell,
        ticker: 'PETR4',
        quantity: 10,
        unitPrice: 10,
        operationalCosts: 0,
        irrfWithheld: 0,
        broker: 'XP',
        sourceType: SourceType.Pdf,
        importedAt: '2025-01-01T00:00:00.000Z',
      },
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items).toEqual([]);
  });

  it('includes manual base when there is no operation history for the asset', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([
      {
        ticker: 'KNRI11',
        broker: 'XP',
        assetType: AssetType.Fii,
        quantity: 3,
        averagePrice: 100,
        isManualBase: true,
      },
    ]);
    jest.spyOn(operationRepository, 'findByPeriod').mockResolvedValue([]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items).toEqual([
      expect.objectContaining({
        ticker: 'KNRI11',
        assetType: AssetType.Fii,
        quantity: 3,
        averagePrice: 100,
        totalCost: 300,
      }),
    ]);
  });

  it('rolls back post-cutoff buy operations for manual base assets', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([
      {
        ticker: 'KNRI11',
        broker: 'XP',
        assetType: AssetType.Fii,
        quantity: 3,
        averagePrice: 100,
        isManualBase: true,
      },
    ]);
    jest
      .spyOn(operationRepository, 'findByPeriod')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          tradeDate: '2026-01-05',
          operationType: OperationType.Buy,
          ticker: 'KNRI11',
          quantity: 1,
          unitPrice: 100,
          operationalCosts: 0,
          irrfWithheld: 0,
          broker: 'XP',
          sourceType: SourceType.Manual,
          importedAt: '2026-01-05T00:00:00.000Z',
        },
      ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items).toEqual([
      expect.objectContaining({
        ticker: 'KNRI11',
        quantity: 2,
        averagePrice: 100,
      }),
    ]);
  });

  it('drops manual base fallback when rollback buy consumes all quantity', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([
      {
        ticker: 'KNRI11',
        broker: 'XP',
        assetType: AssetType.Fii,
        quantity: 1,
        averagePrice: 100,
        isManualBase: true,
      },
    ]);
    jest
      .spyOn(operationRepository, 'findByPeriod')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          tradeDate: '2026-01-05',
          operationType: OperationType.Buy,
          ticker: 'KNRI11',
          quantity: 2,
          unitPrice: 100,
          operationalCosts: 0,
          irrfWithheld: 0,
          broker: 'XP',
          sourceType: SourceType.Manual,
          importedAt: '2026-01-05T00:00:00.000Z',
        },
      ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items).toEqual([]);
  });

  it('rolls back post-cutoff sell operations for manual base assets', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([
      {
        ticker: 'KNRI11',
        broker: 'XP',
        assetType: AssetType.Fii,
        quantity: 3,
        averagePrice: 100,
        isManualBase: true,
      },
    ]);
    jest
      .spyOn(operationRepository, 'findByPeriod')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          tradeDate: '2026-01-05',
          operationType: OperationType.Sell,
          ticker: 'KNRI11',
          quantity: 1,
          unitPrice: 110,
          operationalCosts: 0,
          irrfWithheld: 0,
          broker: 'XP',
          sourceType: SourceType.Manual,
          importedAt: '2026-01-05T00:00:00.000Z',
        },
      ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items).toEqual([
      expect.objectContaining({
        ticker: 'KNRI11',
        quantity: 4,
        averagePrice: 100,
      }),
    ]);
  });

  it('throws when rollback receives unsupported operation type', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([
      {
        ticker: 'KNRI11',
        broker: 'XP',
        assetType: AssetType.Fii,
        quantity: 3,
        averagePrice: 100,
        isManualBase: true,
      },
    ]);
    jest
      .spyOn(operationRepository, 'findByPeriod')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          tradeDate: '2026-01-05',
          operationType: 'other' as OperationType,
          ticker: 'KNRI11',
          quantity: 1,
          unitPrice: 110,
          operationalCosts: 0,
          irrfWithheld: 0,
          broker: 'XP',
          sourceType: SourceType.Manual,
          importedAt: '2026-01-05T00:00:00.000Z',
        },
      ]);

    await expect(useCase.execute({ baseYear: 2025 })).rejects.toThrow(
      'Unsupported operation type for report rollback: other',
    );
  });

  it('does not include fallback for non-manual stored positions', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([
      {
        ticker: 'ABEV3',
        broker: 'XP',
        assetType: AssetType.Stock,
        quantity: 10,
        averagePrice: 12,
        isManualBase: false,
      },
    ]);
    jest.spyOn(operationRepository, 'findByPeriod').mockResolvedValue([]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items).toEqual([]);
  });

  it('uses manual base snapshot rollback with cutoff and post-cutoff operations', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([
      {
        ticker: 'KNRI11',
        broker: 'XP',
        assetType: AssetType.Fii,
        quantity: 3,
        averagePrice: 100,
        isManualBase: true,
      },
    ]);
    jest
      .spyOn(operationRepository, 'findByPeriod')
      .mockResolvedValueOnce([
        {
          tradeDate: '2025-05-01',
          operationType: OperationType.Buy,
          ticker: 'KNRI11',
          quantity: 1,
          unitPrice: 100,
          operationalCosts: 0,
          irrfWithheld: 0,
          broker: 'XP',
          sourceType: SourceType.Manual,
          importedAt: '2025-05-01T00:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          tradeDate: '2025-05-01',
          operationType: OperationType.Buy,
          ticker: 'KNRI11',
          quantity: 1,
          unitPrice: 100,
          operationalCosts: 0,
          irrfWithheld: 0,
          broker: 'XP',
          sourceType: SourceType.Manual,
          importedAt: '2025-05-01T00:00:00.000Z',
        },
        {
          tradeDate: '2026-01-01',
          operationType: OperationType.Buy,
          ticker: 'KNRI11',
          quantity: 2,
          unitPrice: 100,
          operationalCosts: 0,
          irrfWithheld: 0,
          broker: 'XP',
          sourceType: SourceType.Manual,
          importedAt: '2026-01-01T00:00:00.000Z',
        },
      ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items).toEqual([
      expect.objectContaining({
        ticker: 'KNRI11',
        quantity: 1,
        averagePrice: 100,
      }),
    ]);
  });

  it('uses manual base snapshot when there are cutoff operations and no post-cutoff history', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([
      {
        ticker: 'KNRI11',
        broker: 'XP',
        assetType: AssetType.Fii,
        quantity: 3,
        averagePrice: 100,
        isManualBase: true,
      },
    ]);
    jest
      .spyOn(operationRepository, 'findByPeriod')
      .mockResolvedValueOnce([
        {
          tradeDate: '2025-05-01',
          operationType: OperationType.Buy,
          ticker: 'KNRI11',
          quantity: 1,
          unitPrice: 100,
          operationalCosts: 0,
          irrfWithheld: 0,
          broker: 'XP',
          sourceType: SourceType.Manual,
          importedAt: '2025-05-01T00:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          tradeDate: '2025-05-01',
          operationType: OperationType.Buy,
          ticker: 'KNRI11',
          quantity: 1,
          unitPrice: 100,
          operationalCosts: 0,
          irrfWithheld: 0,
          broker: 'XP',
          sourceType: SourceType.Manual,
          importedAt: '2025-05-01T00:00:00.000Z',
        },
      ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items).toEqual([
      expect.objectContaining({
        ticker: 'KNRI11',
        quantity: 3,
        averagePrice: 100,
      }),
    ]);
  });

  it('removes manual base position when rollback with cutoff operations reaches zero', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([
      {
        ticker: 'KNRI11',
        broker: 'XP',
        assetType: AssetType.Fii,
        quantity: 1,
        averagePrice: 100,
        isManualBase: true,
      },
    ]);
    jest
      .spyOn(operationRepository, 'findByPeriod')
      .mockResolvedValueOnce([
        {
          tradeDate: '2025-05-01',
          operationType: OperationType.Buy,
          ticker: 'KNRI11',
          quantity: 1,
          unitPrice: 100,
          operationalCosts: 0,
          irrfWithheld: 0,
          broker: 'XP',
          sourceType: SourceType.Manual,
          importedAt: '2025-05-01T00:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          tradeDate: '2025-05-01',
          operationType: OperationType.Buy,
          ticker: 'KNRI11',
          quantity: 1,
          unitPrice: 100,
          operationalCosts: 0,
          irrfWithheld: 0,
          broker: 'XP',
          sourceType: SourceType.Manual,
          importedAt: '2025-05-01T00:00:00.000Z',
        },
        {
          tradeDate: '2026-01-01',
          operationType: OperationType.Buy,
          ticker: 'KNRI11',
          quantity: 2,
          unitPrice: 100,
          operationalCosts: 0,
          irrfWithheld: 0,
          broker: 'XP',
          sourceType: SourceType.Manual,
          importedAt: '2026-01-01T00:00:00.000Z',
        },
      ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items).toEqual([]);
  });

  it('does not include manual base fallback when quantity is zero', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([
      {
        ticker: 'ABEV3',
        broker: 'XP',
        assetType: AssetType.Stock,
        quantity: 0,
        averagePrice: 12,
        isManualBase: true,
      },
    ]);
    jest.spyOn(operationRepository, 'findByPeriod').mockResolvedValue([]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items).toEqual([]);
  });

  it('defaults asset type to stock when not found in stored positions', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([]);
    jest.spyOn(operationRepository, 'findByPeriod').mockResolvedValue([
      {
        tradeDate: '2025-01-01',
        operationType: OperationType.Buy,
        ticker: 'VALE3',
        quantity: 1,
        unitPrice: 10,
        operationalCosts: 0,
        irrfWithheld: 0,
        broker: 'XP',
        sourceType: SourceType.Csv,
        importedAt: '2025-01-01T00:00:00.000Z',
      },
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        ticker: 'VALE3',
        assetType: AssetType.Stock,
      }),
    );
  });

  it('throws when operation type is unsupported', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([]);
    jest.spyOn(operationRepository, 'findByPeriod').mockResolvedValue([
      {
        tradeDate: '2025-01-01',
        operationType: 'other' as OperationType,
        ticker: 'PETR4',
        quantity: 1,
        unitPrice: 10,
        operationalCosts: 0,
        irrfWithheld: 0,
        broker: 'XP',
        sourceType: SourceType.Pdf,
        importedAt: '2025-01-01T00:00:00.000Z',
      },
    ]);

    await expect(useCase.execute({ baseYear: 2025 })).rejects.toThrow(
      'Unsupported operation type for report: other',
    );
  });

  it('handles zero quantity buy without creating report item', async () => {
    jest.spyOn(portfolioPositionRepository, 'findAll').mockResolvedValue([]);
    jest.spyOn(operationRepository, 'findByPeriod').mockResolvedValue([
      {
        tradeDate: '2025-01-01',
        operationType: OperationType.Buy,
        ticker: 'PETR4',
        quantity: 0,
        unitPrice: 10,
        operationalCosts: 0,
        irrfWithheld: 0,
        broker: 'XP',
        sourceType: SourceType.Pdf,
        importedAt: '2025-01-01T00:00:00.000Z',
      },
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items).toEqual([]);
  });
});
