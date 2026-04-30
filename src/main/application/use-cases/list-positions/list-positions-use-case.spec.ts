import { mock } from 'jest-mock-extended';
import { AssetType, AssetTypeSource } from '../../../../shared/types/domain';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { AssetRepository } from '../../repositories/asset.repository';
import type { BrokerRepository } from '../../repositories/broker.repository';
import { ListPositionsUseCase } from './list-positions-use-case';
import { Asset } from '../../../domain/portfolio/entities/asset.entity';
import { Broker } from '../../../domain/portfolio/entities/broker.entity';
import { Uuid } from '../../../domain/shared/uuid.vo';
import { Cnpj } from '../../../domain/shared/cnpj.vo';
import { AssetPosition } from '../../../domain/portfolio/entities/asset-position.entity';
import { Money } from '../../../domain/portfolio/value-objects/money.vo';
import { Quantity } from '../../../domain/portfolio/value-objects/quantity.vo';

describe('ListPositionsUseCase', () => {
  const positionRepository = mock<AssetPositionRepository>();
  const brokerRepository = mock<BrokerRepository>();
  const assetRepository = mock<AssetRepository>();
  const brokerId = Uuid.create();
  let useCase: ListPositionsUseCase;

  beforeEach(() => {
    brokerRepository.findAll.mockResolvedValue([
      Broker.restore({
        id: brokerId,
        name: 'XP Investimentos',
        cnpj: new Cnpj('02.332.886/0001-04'),
        code: 'XP',
      }),
    ]);
    assetRepository.findByTickersList.mockResolvedValue([]);
    useCase = new ListPositionsUseCase(positionRepository, brokerRepository, assetRepository);
  });

  it('should return mapped position list with broker breakdown enriched', async () => {
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.restore({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(100),
        averagePrice: Money.from(20),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(100) }],
      }),
    ]);
    const result = await useCase.execute({ baseYear: 2025 });

    expect(result).toEqual({
      items: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          totalQuantity: '100',
          averagePrice: '20',
          totalCost: '2000',
          brokerBreakdown: [
            {
              brokerId: brokerId.value,
              brokerName: 'XP Investimentos',
              brokerCnpj: '02.332.886/0001-04',
              quantity: '100',
            },
          ],
        },
      ],
    });
  });

  it('prefers the corrected catalog asset type over the stale persisted position type', async () => {
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.restore({
        ticker: 'IVVB11',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(10),
        averagePrice: Money.from(100),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(10) }],
      }),
    ]);
    assetRepository.findByTickersList.mockResolvedValue([
      Asset.create({
        ticker: 'IVVB11',
        assetType: AssetType.Etf,
        resolutionSource: AssetTypeSource.Manual,
      }),
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items[0]?.assetType).toBe(AssetType.Etf);
  });
});
