import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AssetType, OperationType } from '../../../shared/types/domain';
import type { TradeOperationQueryPort } from '../queries/trade-operation.query.interface';
import type { PortfolioPositionRepositoryPort } from '../repositories/portfolio-position.repository.interface';
import { RecalculateAssetPositionUseCase } from './recalculate-asset-position-use-case';

describe('RecalculateAssetPositionUseCase', () => {
  let portfolioPositionRepository: PortfolioPositionRepositoryPort;
  let tradeOperationQuery: TradeOperationQueryPort;
  let useCase: RecalculateAssetPositionUseCase;

  beforeEach(() => {
    portfolioPositionRepository = {
      findByTickerAndBroker: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    };
    tradeOperationQuery = {
      findTradesByTickerAndBroker: jest.fn(),
    };
    useCase = new RecalculateAssetPositionUseCase(portfolioPositionRepository, tradeOperationQuery);
  });

  it('creates a new position when there is no current snapshot', async () => {
    const findPositionMock = jest
      .spyOn(portfolioPositionRepository, 'findByTickerAndBroker')
      .mockResolvedValue(null);
    const findTradesMock = jest
      .spyOn(tradeOperationQuery, 'findTradesByTickerAndBroker')
      .mockResolvedValue([
        {
          operationType: OperationType.Buy,
          quantity: 10,
          unitPrice: 10,
          operationalCosts: 0,
        },
      ]);
    const saveSpy = jest.spyOn(portfolioPositionRepository, 'save').mockResolvedValue(undefined);

    await useCase.execute({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
    });

    expect(findPositionMock).toHaveBeenCalledWith({ ticker: 'PETR4', broker: 'XP' });
    expect(findTradesMock).toHaveBeenCalledWith({ ticker: 'PETR4', broker: 'XP' });
    expect(saveSpy).toHaveBeenCalledWith({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 10,
      averagePrice: 10,
      isManualBase: false,
    });
  });

  it('uses current position snapshot when available', async () => {
    jest.spyOn(portfolioPositionRepository, 'findByTickerAndBroker').mockResolvedValue({
      ticker: 'VALE3',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 20,
      averagePrice: 50,
      isManualBase: true,
    });
    jest.spyOn(tradeOperationQuery, 'findTradesByTickerAndBroker').mockResolvedValue([
      {
        operationType: OperationType.Sell,
        quantity: 5,
        unitPrice: 0,
        operationalCosts: 0,
      },
    ]);
    const saveSpy = jest.spyOn(portfolioPositionRepository, 'save').mockResolvedValue(undefined);

    await useCase.execute({
      ticker: 'VALE3',
      broker: 'XP',
      assetType: AssetType.Stock,
    });

    expect(saveSpy).toHaveBeenCalledWith({
      ticker: 'VALE3',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 15,
      averagePrice: 50,
      isManualBase: true,
    });
  });

  it('throws when an unsupported operation type is received', async () => {
    jest.spyOn(portfolioPositionRepository, 'findByTickerAndBroker').mockResolvedValue(null);
    jest.spyOn(tradeOperationQuery, 'findTradesByTickerAndBroker').mockResolvedValue([
      {
        operationType: 'other' as OperationType,
        quantity: 1,
        unitPrice: 1,
        operationalCosts: 0,
      },
    ]);

    await expect(
      useCase.execute({
        ticker: 'ITSA4',
        broker: 'XP',
        assetType: AssetType.Stock,
      }),
    ).rejects.toThrow('Unsupported operation type.');
  });
});
