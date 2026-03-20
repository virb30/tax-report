import { beforeEach, describe, expect, it } from '@jest/globals';
import { mock } from 'jest-mock-extended';
import { AssetType } from '../../../../shared/types/domain';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { BrokerRepository } from '../../repositories/broker.repository';
import { ListPositionsUseCase } from './list-positions-use-case';
import { Broker } from '../../../domain/portfolio/entities/broker.entity';
import { Uuid } from '../../../domain/shared/uuid.vo';
import { Cnpj } from '../../../domain/shared/cnpj.vo';
import { AssetPosition } from '../../../domain/portfolio/entities/asset-position.entity';

describe('ListPositionsUseCase', () => {
  const positionRepository = mock<AssetPositionRepository>();
  const brokerRepository = mock<BrokerRepository>();
  const brokerId = Uuid.create();
  let useCase: ListPositionsUseCase;

  beforeEach(() => {
    brokerRepository.findAll.mockResolvedValue([
      Broker.restore({ id: brokerId, name: 'XP Investimentos', cnpj: new Cnpj('02.332.886/0001-04'), code: 'XP' }),
    ]);
    useCase = new ListPositionsUseCase(
      positionRepository,
      brokerRepository,
    );
  });

  it('should return mapped position list with broker breakdown enriched', async () => {
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.restore({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 100,
        averagePrice: 20,
        brokerBreakdown: [{ brokerId, quantity: 100 }],
      }),
    ]);
    const result = await useCase.execute({ baseYear: 2025 });

    expect(result).toEqual({
      items: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          totalQuantity: 100,
          averagePrice: 20,
          totalCost: 2000,
          brokerBreakdown: [
            {
              brokerId: brokerId.value,
              brokerName: 'XP Investimentos',
              brokerCnpj: '02.332.886/0001-04',
              quantity: 100,
            },
          ],
        },
      ],
    });
  });
});
