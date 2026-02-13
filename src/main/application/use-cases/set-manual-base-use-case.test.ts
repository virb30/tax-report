import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AssetType } from '../../../shared/types/domain';
import type { PortfolioPositionRepositoryPort } from '../repositories/portfolio-position.repository.interface';
import { SetManualBaseUseCase } from './set-manual-base-use-case';

describe('SetManualBaseUseCase', () => {
  let portfolioPositionRepository: PortfolioPositionRepositoryPort;
  let useCase: SetManualBaseUseCase;

  beforeEach(() => {
    portfolioPositionRepository = {
      findByTickerAndBroker: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new SetManualBaseUseCase(portfolioPositionRepository);
  });

  it('persists manual base with isManualBase enabled', async () => {
    const result = await useCase.execute({
      ticker: 'ITUB4',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 20,
      averagePrice: 25,
    });

    expect(portfolioPositionRepository.save).toHaveBeenCalledWith({
      ticker: 'ITUB4',
      broker: 'XP',
      assetType: AssetType.Stock,
      quantity: 20,
      averagePrice: 25,
      isManualBase: true,
    });
    expect(result).toEqual({
      ticker: 'ITUB4',
      broker: 'XP',
      quantity: 20,
      averagePrice: 25,
      isManualBase: true,
    });
  });

  it('throws when quantity exists with zero average price', async () => {
    await expect(
      useCase.execute({
        ticker: 'ITUB4',
        broker: 'XP',
        assetType: AssetType.Stock,
        quantity: 20,
        averagePrice: 0,
      }),
    ).rejects.toThrow('Average price must be greater than zero when quantity exists.');
  });
});
