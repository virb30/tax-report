import { describe, expect, it } from '@jest/globals';
import { AssetType, OperationType } from '../../../shared/types/domain';
import type { TradeOperationQueryPort } from '../queries/trade-operation.query.interface';
import type { PortfolioPositionRepositoryPort } from '../repositories/portfolio-position.repository.interface';
import { RecalculateAssetPositionUseCase } from './recalculate-asset-position-use-case';

class InMemoryPortfolioPositionRepository implements PortfolioPositionRepositoryPort {
  private readonly data = new Map<string, { quantity: number; averagePrice: number; isManualBase: boolean }>();

  findByTickerAndBroker(input: { ticker: string; broker: string }) {
    const key = `${input.ticker}-${input.broker}`;
    const snapshot = this.data.get(key);
    if (!snapshot) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      ticker: input.ticker,
      broker: input.broker,
      assetType: AssetType.Stock,
      quantity: snapshot.quantity,
      averagePrice: snapshot.averagePrice,
      isManualBase: snapshot.isManualBase,
    });
  }

  save(snapshot: {
    ticker: string;
    broker: string;
    assetType: AssetType;
    quantity: number;
    averagePrice: number;
    isManualBase: boolean;
  }) {
    const key = `${snapshot.ticker}-${snapshot.broker}`;
    this.data.set(key, {
      quantity: snapshot.quantity,
      averagePrice: snapshot.averagePrice,
      isManualBase: snapshot.isManualBase,
    });
    return Promise.resolve();
  }
}

class InMemoryTradeOperationQuery implements TradeOperationQueryPort {
  constructor(
    private readonly trades: Array<{
      operationType: OperationType;
      quantity: number;
      unitPrice: number;
      operationalCosts: number;
    }>,
  ) {}

  findTradesByTickerAndBroker() {
    return Promise.resolve(this.trades);
  }
}

describe('RecalculateAssetPositionUseCase in-memory integration', () => {
  it('applies buy and sell operations and persists resulting position', async () => {
    const repository = new InMemoryPortfolioPositionRepository();
    const tradeQuery = new InMemoryTradeOperationQuery([
      { operationType: OperationType.Buy, quantity: 10, unitPrice: 20, operationalCosts: 0 },
      { operationType: OperationType.Buy, quantity: 10, unitPrice: 30, operationalCosts: 0 },
      { operationType: OperationType.Sell, quantity: 5, unitPrice: 0, operationalCosts: 0 },
    ]);

    const useCase = new RecalculateAssetPositionUseCase(repository, tradeQuery);

    await useCase.execute({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
    });

    const savedPosition = await repository.findByTickerAndBroker({
      ticker: 'PETR4',
      broker: 'XP',
    });

    expect(savedPosition).toEqual({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 15,
      averagePrice: 25,
      isManualBase: false,
    });
  });
});
