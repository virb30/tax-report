import { beforeEach, describe, expect, it } from '@jest/globals';
import { mock } from 'jest-mock-extended';
import { DeletePositionUseCase } from './delete-position-use-case';
import type { PositionRepository } from '../../repositories/position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { AssetType } from '../../../../shared/types/domain';
import { Uuid } from '../../../domain/shared/uuid.vo';
import { AssetPosition } from '../../../domain/portfolio/asset-position.entity';

describe('DeletePositionUseCase', () => {
  let positionRepo: jest.Mocked<PositionRepository>;
  let transactionRepo: jest.Mocked<TransactionRepository>;
  let useCase: DeletePositionUseCase;

  beforeEach(() => {
    positionRepo = mock<PositionRepository>();
    transactionRepo = mock<TransactionRepository>();    
    transactionRepo.deleteByTickerAndYear.mockResolvedValue(undefined);
    positionRepo.delete.mockResolvedValue(undefined);

    useCase = new DeletePositionUseCase(positionRepo, transactionRepo);
  });

  it('deletes position and transactions when position exists', async () => {
    const brokerId = Uuid.create();
    positionRepo.findByTickerAndYear.mockResolvedValue(AssetPosition.restore({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      year: 2024,
      totalQuantity: 100,
      averagePrice: 25,
      brokerBreakdown: [{ brokerId,  quantity: 100 }],
    }));

    const result = await useCase.execute({ ticker: 'PETR4', year: 2024 });

    expect(result.deleted).toBe(true);
    expect(transactionRepo.deleteByTickerAndYear).toHaveBeenCalledWith(
      'PETR4',
      2024,
    );
    expect(positionRepo.delete).toHaveBeenCalledWith('PETR4', 2024);
  });

  it('returns deleted false when position does not exist', async () => {
    positionRepo.findByTickerAndYear.mockResolvedValue(null);

    const result = await useCase.execute({ ticker: 'PETR4', year: 2024 });

    expect(result.deleted).toBe(false);
    expect(transactionRepo.deleteByTickerAndYear).not.toHaveBeenCalled();
    expect(positionRepo.delete).not.toHaveBeenCalled();
  });

  it('throws when ticker is invalid', async () => {
    await expect(useCase.execute({ ticker: '', year: 2024 })).rejects.toThrow(/Ticker/);
    await expect(useCase.execute({ ticker: '  ', year: 2024 })).rejects.toThrow(/Ticker/);
  });

  it('throws when year is invalid', async () => {
    await expect(useCase.execute({ ticker: 'PETR4', year: 1999 })).rejects.toThrow(/Ano/);
    await expect(useCase.execute({ ticker: 'PETR4', year: 2101 })).rejects.toThrow(/Ano/);
  });
});
