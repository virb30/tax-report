import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AssetType } from '../../../shared/types/domain';
import type { PositionRepository } from '../repositories/position.repository';
import type { BrokerRepositoryPort } from '../repositories/broker.repository';
import { ListPositionsUseCase } from './list-positions-use-case';

describe('ListPositionsUseCase', () => {
  let positionRepository: PositionRepository;
  let brokerRepository: BrokerRepositoryPort;
  let findAllMock: jest.Mock;
  let findByIdMock: jest.Mock;
  let useCase: ListPositionsUseCase;

  beforeEach(() => {
    findAllMock = jest.fn().mockResolvedValue([
      {
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        totalQuantity: 10,
        averagePrice: 20,
        brokerBreakdown: [{ brokerId: 'broker-xp', quantity: 10 }],
      },
    ]);
    findByIdMock = jest.fn().mockResolvedValue({
      id: 'broker-xp',
      name: 'XP Investimentos',
      cnpj: '02.332.886/0001-04',
    });
    positionRepository = {
      findByTicker: jest.fn(),
      findAll: findAllMock,
      save: jest.fn(),
    };
    brokerRepository = {
      findById: findByIdMock,
      findByName: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    };
    useCase = new ListPositionsUseCase(positionRepository, brokerRepository);
  });

  it('returns mapped position list with broker breakdown enriched', async () => {
    const result = await useCase.execute();

    expect(findAllMock).toHaveBeenCalledTimes(1);
    expect(findByIdMock).toHaveBeenCalledWith('broker-xp');
    expect(result).toEqual({
      items: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          totalQuantity: 10,
          averagePrice: 20,
          totalCost: 200,
          brokerBreakdown: [
            {
              brokerId: 'broker-xp',
              brokerName: 'XP Investimentos',
              brokerCnpj: '02.332.886/0001-04',
              quantity: 10,
            },
          ],
        },
      ],
    });
  });

  it('uses brokerId when broker not found', async () => {
    findByIdMock.mockResolvedValue(null);
    const result = await useCase.execute();

    expect(result.items[0].brokerBreakdown[0].brokerName).toBe('broker-xp');
    expect(result.items[0].brokerBreakdown[0].brokerCnpj).toBe('');
  });
});
