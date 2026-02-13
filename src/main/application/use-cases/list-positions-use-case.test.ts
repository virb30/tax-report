import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AssetType } from '../../../shared/types/domain';
import type { PortfolioPositionRepositoryPort } from '../repositories/portfolio-position.repository.interface';
import { ListPositionsUseCase } from './list-positions-use-case';

describe('ListPositionsUseCase', () => {
  let portfolioPositionRepository: PortfolioPositionRepositoryPort;
  let findAllMock: jest.Mock;
  let useCase: ListPositionsUseCase;

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
    ]);
    portfolioPositionRepository = {
      findByTickerAndBroker: jest.fn(),
      findAll: findAllMock,
      save: jest.fn(),
    };
    useCase = new ListPositionsUseCase(portfolioPositionRepository);
  });

  it('returns mapped position list with total cost', async () => {
    const result = await useCase.execute();

    expect(findAllMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      items: [
        {
          ticker: 'PETR4',
          broker: 'XP',
          assetType: AssetType.Stock,
          quantity: 10,
          averagePrice: 20,
          totalCost: 200,
          isManualBase: false,
        },
      ],
    });
  });
});
