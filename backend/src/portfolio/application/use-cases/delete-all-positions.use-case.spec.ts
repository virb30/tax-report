import { mock } from 'jest-mock-extended';
import type { AssetPositionRepository } from '../repositories/asset-position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { DeleteAllPositionsUseCase } from './delete-all-positions.use-case';
import { AssetType } from '../../../shared/types/domain';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { AssetPosition } from '../../domain/entities/asset-position.entity';
import { Quantity } from '../../domain/value-objects/quantity.vo';
import { Money } from '../../domain/value-objects/money.vo';

describe('DeleteAllPositionsUseCase', () => {
  let positionRepo: jest.Mocked<AssetPositionRepository>;
  let transactionRepo: jest.Mocked<TransactionRepository>;
  let useCase: DeleteAllPositionsUseCase;

  beforeEach(() => {
    positionRepo = mock<AssetPositionRepository>();
    transactionRepo = mock<TransactionRepository>();
    transactionRepo.deleteByTickerAndYear.mockResolvedValue(undefined);
    positionRepo.delete.mockResolvedValue(undefined);

    useCase = new DeleteAllPositionsUseCase(positionRepo, transactionRepo);
  });

  it('deletes all positions and linked transactions for a year', async () => {
    const brokerId = Uuid.create();
    positionRepo.findAllByYear.mockResolvedValue([
      AssetPosition.restore({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2024,
        totalQuantity: Quantity.from(100),
        averagePrice: Money.from(25),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(100) }],
      }),
      AssetPosition.restore({
        ticker: 'VALE3',
        assetType: AssetType.Stock,
        year: 2024,
        totalQuantity: Quantity.from(10),
        averagePrice: Money.from(60),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(10) }],
      }),
    ]);

    const result = await useCase.execute({ year: 2024 });

    expect(result).toEqual({ deletedCount: 2 });
    expect(transactionRepo.deleteByTickerAndYear).toHaveBeenCalledWith('PETR4', 2024);
    expect(transactionRepo.deleteByTickerAndYear).toHaveBeenCalledWith('VALE3', 2024);
    expect(positionRepo.delete).toHaveBeenCalledWith('PETR4', 2024);
    expect(positionRepo.delete).toHaveBeenCalledWith('VALE3', 2024);
  });

  it('returns zero when there are no positions in the year', async () => {
    positionRepo.findAllByYear.mockResolvedValue([]);

    const result = await useCase.execute({ year: 2024 });

    expect(result).toEqual({ deletedCount: 0 });
    expect(transactionRepo.deleteByTickerAndYear).not.toHaveBeenCalled();
    expect(positionRepo.delete).not.toHaveBeenCalled();
  });

  it('throws when year is invalid', async () => {
    await expect(useCase.execute({ year: 1999 })).rejects.toThrow(/Ano/);
    await expect(useCase.execute({ year: 2101 })).rejects.toThrow(/Ano/);
  });
});
