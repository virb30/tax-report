import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AssetType } from '../../../shared/types/domain';
import { TransactionType } from '../../../shared/types/domain';
import { SourceType } from '../../../shared/types/domain';
import type { PositionRepository } from '../repositories/position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import type { BrokerRepositoryPort } from '../repositories/broker.repository';
import { ListPositionsUseCase } from './list-positions-use-case';

describe('ListPositionsUseCase', () => {
  let positionRepository: PositionRepository;
  let transactionRepository: TransactionRepository;
  let brokerRepository: BrokerRepositoryPort;
  let useCase: ListPositionsUseCase;

  beforeEach(() => {
    positionRepository = {
      findByTicker: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      save: jest.fn(),
    };
    transactionRepository = {
      save: jest.fn(),
      saveMany: jest.fn(),
      findByTicker: jest.fn(),
      findByPeriod: jest.fn().mockResolvedValue([
        {
          id: '1',
          date: '2025-01-01',
          type: TransactionType.InitialBalance,
          ticker: 'PETR4',
          quantity: 100,
          unitPrice: 20,
          fees: 0,
          brokerId: 'broker-xp',
          sourceType: SourceType.Manual,
        },
      ]),
    } as unknown as TransactionRepository;
    brokerRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'broker-xp',
        name: 'XP Investimentos',
        cnpj: '02.332.886/0001-04',
      }),
      findByName: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    } as unknown as BrokerRepositoryPort;
    useCase = new ListPositionsUseCase(
      positionRepository,
      transactionRepository,
      brokerRepository,
    );
  });

  it('returns mapped position list with broker breakdown enriched', async () => {
    const result = await useCase.execute({ baseYear: 2025 });

    expect(transactionRepository.findByPeriod).toHaveBeenCalledWith({
      startDate: '0000-01-01',
      endDate: '2025-12-31',
    });
    expect(brokerRepository.findById).toHaveBeenCalledWith('broker-xp');
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
              brokerId: 'broker-xp',
              brokerName: 'XP Investimentos',
              brokerCnpj: '02.332.886/0001-04',
              quantity: 100,
            },
          ],
        },
      ],
    });
  });

  it('uses brokerId when broker not found', async () => {
    (brokerRepository.findById as jest.Mock).mockResolvedValue(null);
    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items[0].brokerBreakdown[0].brokerName).toBe('broker-xp');
    expect(result.items[0].brokerBreakdown[0].brokerCnpj).toBe('');
  });
});
