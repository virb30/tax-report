import { mock, mockReset } from 'jest-mock-extended';
import { AssetPosition } from '../../domain/entities/asset-position.entity';
import type { AssetPositionRepository } from '../repositories/asset-position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { AssetType, SourceType, TransactionType } from '../../../shared/types/domain';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { Money } from '../../domain/value-objects/money.vo';
import { Quantity } from '../../domain/value-objects/quantity.vo';
import { SetInitialBalanceUseCase } from './set-initial-balance.use-case';

const positionRepository = mock<AssetPositionRepository>();
const transactionRepository = mock<TransactionRepository>();
const brokerId = Uuid.create().value;

function createUseCase(): SetInitialBalanceUseCase {
  return new SetInitialBalanceUseCase(positionRepository, transactionRepository);
}

describe('SetInitialBalanceUseCase', () => {
  beforeEach(() => {
    mockReset(positionRepository);
    mockReset(transactionRepository);
    positionRepository.findByTickerAndYear.mockResolvedValue(null);
  });

  it('creates a position and initial balance transaction when none exists', async () => {
    const useCase = createUseCase();

    const result = await useCase.execute({
      ticker: 'PETR4',
      brokerId,
      assetType: AssetType.Stock,
      quantity: 10,
      averagePrice: 25.5,
      year: 2026,
    });

    const savedPosition = positionRepository.save.mock.calls[0]?.[0];
    const savedTransaction = transactionRepository.save.mock.calls[0]?.[0];

    expect(result).toEqual({
      ticker: 'PETR4',
      brokerId,
      quantity: 10,
      averagePrice: 25.5,
    });
    expect(savedPosition).toBeInstanceOf(AssetPosition);
    expect(savedPosition?.ticker).toBe('PETR4');
    expect(savedPosition?.year).toBe(2026);
    expect(savedTransaction).toMatchObject({
      date: '2026-01-01',
      type: TransactionType.InitialBalance,
      ticker: 'PETR4',
      sourceType: SourceType.Manual,
    });
    expect(savedTransaction?.quantity.getAmount()).toBe('10');
    expect(savedTransaction?.unitPrice.getAmount()).toBe('25.5');
  });

  it('updates an existing position before saving the initial balance transaction', async () => {
    const position = AssetPosition.create({
      ticker: 'BBAS3',
      assetType: AssetType.Stock,
      year: 2025,
    });
    position.applyInitialBalance({
      quantity: Quantity.from(5),
      averagePrice: Money.from(20),
      brokerId: Uuid.from(brokerId),
    });
    positionRepository.findByTickerAndYear.mockResolvedValue(position);

    const result = await createUseCase().execute({
      ticker: 'BBAS3',
      brokerId,
      assetType: AssetType.Stock,
      quantity: 8,
      averagePrice: 30,
      year: 2025,
    });

    expect(result).toEqual({
      ticker: 'BBAS3',
      brokerId,
      quantity: 8,
      averagePrice: 30,
    });
    expect(positionRepository.save).toHaveBeenCalledWith(position);
    expect(transactionRepository.save).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      input: { ticker: '', brokerId, quantity: 1, averagePrice: 1, year: 2026 },
      message: 'Ticker é obrigatório.',
    },
    {
      input: { ticker: 'PETR4', brokerId: '', quantity: 1, averagePrice: 1, year: 2026 },
      message: 'Corretora é obrigatória.',
    },
    {
      input: { ticker: 'PETR4', brokerId, quantity: 0, averagePrice: 1, year: 2026 },
      message: 'Quantidade deve ser maior que zero.',
    },
    {
      input: { ticker: 'PETR4', brokerId, quantity: 1, averagePrice: -1, year: 2026 },
      message: 'Preço médio deve ser maior ou igual a zero.',
    },
    {
      input: { ticker: 'PETR4', brokerId, quantity: 1, averagePrice: 1, year: 0 },
      message: 'Ano inválido.',
    },
  ])('rejects invalid initial balance input: $message', async ({ input, message }) => {
    await expect(
      createUseCase().execute({
        ...input,
        assetType: AssetType.Stock,
      }),
    ).rejects.toThrow(message);

    expect(transactionRepository.save).not.toHaveBeenCalled();
    expect(positionRepository.save).not.toHaveBeenCalled();
  });
});
