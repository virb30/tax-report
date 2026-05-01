import { AssetType } from '../../../../../shared/types/domain';
import { TransactionType } from '../../../../../shared/types/domain';
import { SourceType } from '../../../../../shared/types/domain';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { RecalculatePositionUseCase } from './recalculate-position.use-case';
import { mock, mockReset } from 'jest-mock-extended';
import { Transaction } from '../../../domain/entities/transaction.entity';
import { Uuid } from '../../../../shared/domain/value-objects/uuid.vo';
import { AssetPosition } from '../../../domain/entities/asset-position.entity';
import { Money } from '../../../domain/value-objects/money.vo';
import { Quantity } from '../../../domain/value-objects/quantity.vo';

describe('RecalculatePositionUseCase', () => {
  const positionRepository = mock<AssetPositionRepository>();
  const transactionRepository = mock<TransactionRepository>();
  let useCase: RecalculatePositionUseCase;

  beforeEach(() => {
    mockReset(positionRepository);
    mockReset(transactionRepository);
    positionRepository.findByTickerAndYear.mockResolvedValue(null);
    positionRepository.findAllByYear.mockResolvedValue([]);
    positionRepository.save.mockResolvedValue(undefined);
    transactionRepository.save.mockResolvedValue(undefined);
    transactionRepository.saveMany.mockResolvedValue(undefined);
    transactionRepository.findByTicker.mockResolvedValue([]);
    transactionRepository.findByPeriod.mockResolvedValue([]);
    useCase = new RecalculatePositionUseCase(positionRepository, transactionRepository);
  });

  it('creates a new position when position not found but transactions exist', async () => {
    const brokerId = Uuid.create();
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2024-06-15',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: Quantity.from(50),
        unitPrice: Money.from(25),
        fees: Money.from(5),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ ticker: 'PETR4', year: 2024 });
    expect(positionRepository.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      totalQuantity: '50',
      averagePrice: '25.1',
    });
  });

  it('does not compound an already persisted calculated position', async () => {
    const brokerId = Uuid.create();
    positionRepository.findByTickerAndYear.mockResolvedValue(
      AssetPosition.create({
        ticker: 'PETR4',
        year: 2024,
        assetType: AssetType.Stock,
        totalQuantity: Quantity.from(50),
        averagePrice: Money.from(25.1),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(50) }],
      }),
    );
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2024-06-15',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: Quantity.from(50),
        unitPrice: Money.from(25),
        fees: Money.from(5),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ ticker: 'PETR4', year: 2024 });

    expect(positionRepository.save).toHaveBeenCalledTimes(1);
    expect(positionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        totalQuantity: Quantity.from(50),
        averagePrice: Money.from(25.1),
      }),
    );
    expect(result).toEqual({
      totalQuantity: '50',
      averagePrice: '25.1',
    });
  });

  it('recalculates position from mix of Buy, Sell, Bonus and InitialBalance', async () => {
    positionRepository.findByTickerAndYear.mockResolvedValue(
      AssetPosition.create({
        ticker: 'PETR4',
        year: 2024,
        assetType: AssetType.Stock,
        totalQuantity: Quantity.from(0),
        averagePrice: Money.from(0),
        brokerBreakdown: [],
      }),
    );
    const brokerId = Uuid.create();
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2024-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'PETR4',
        quantity: Quantity.from(100),
        unitPrice: Money.from(20),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2024-06-15',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: Quantity.from(50),
        unitPrice: Money.from(25),
        fees: Money.from(5),
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2024-09-01',
        type: TransactionType.Sell,
        ticker: 'PETR4',
        quantity: Quantity.from(30),
        unitPrice: Money.from(30),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ ticker: 'PETR4', year: 2024 });
    expect(positionRepository.save).toHaveBeenCalledTimes(1);
    expect(positionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        totalQuantity: Quantity.from(120),
        averagePrice: Money.from(21.7),
      }),
    );
    expect(result).toEqual({
      totalQuantity: '120',
      averagePrice: '21.7',
    });
  });

  it('ignores previous-year transactions when target year has an initial balance', async () => {
    const nuBrokerId = Uuid.create();
    const xpBrokerId = Uuid.create();
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2024-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'PETR4',
        quantity: Quantity.from(1),
        unitPrice: Money.from(20),
        fees: Money.from(0),
        brokerId: nuBrokerId,
        sourceType: SourceType.Manual,
      }),
      ...Array.from({ length: 5 }, (_, index) =>
        Transaction.create({
          date: `2024-02-${String(index + 1).padStart(2, '0')}`,
          type: TransactionType.Buy,
          ticker: 'PETR4',
          quantity: Quantity.from(1),
          unitPrice: Money.from(20),
          fees: Money.from(0),
          brokerId: nuBrokerId,
          sourceType: SourceType.Manual,
        }),
      ),
      Transaction.create({
        date: '2024-03-01',
        type: TransactionType.TransferIn,
        ticker: 'PETR4',
        quantity: Quantity.from(6),
        unitPrice: Money.from(0),
        fees: Money.from(0),
        brokerId: xpBrokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2024-03-01',
        type: TransactionType.TransferOut,
        ticker: 'PETR4',
        quantity: Quantity.from(6),
        unitPrice: Money.from(0),
        fees: Money.from(0),
        brokerId: nuBrokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2024-04-01',
        type: TransactionType.Sell,
        ticker: 'PETR4',
        quantity: Quantity.from(1),
        unitPrice: Money.from(30),
        fees: Money.from(0),
        brokerId: xpBrokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2024-05-01',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: Quantity.from(1),
        unitPrice: Money.from(25),
        fees: Money.from(0),
        brokerId: xpBrokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2024-06-01',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: Quantity.from(1),
        unitPrice: Money.from(25),
        fees: Money.from(0),
        brokerId: xpBrokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2023-10-10',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: Quantity.from(1),
        unitPrice: Money.from(20),
        fees: Money.from(0),
        brokerId: Uuid.create(),
        sourceType: SourceType.Manual,
      }),
    ]);

    await useCase.execute({ ticker: 'PETR4', year: 2024 });

    expect(positionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        totalQuantity: Quantity.from(7),
        brokerBreakdown: [{ brokerId: xpBrokerId, quantity: Quantity.from(7) }],
      }),
    );
  });

  it('uses existing position assetType when recalculating', async () => {
    const brokerId = Uuid.create();
    positionRepository.findByTickerAndYear.mockResolvedValue(
      AssetPosition.create({
        ticker: 'HGLG11',
        year: 2024,
        assetType: AssetType.Fii,
        totalQuantity: Quantity.from(10),
        averagePrice: Money.from(150),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(10) }],
      }),
    );
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2024-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'HGLG11',
        quantity: Quantity.from(10),
        unitPrice: Money.from(150),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ ticker: 'HGLG11', year: 2024 });
    expect(positionRepository.save).toHaveBeenCalledTimes(1);
    expect(positionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        totalQuantity: Quantity.from(10),
        averagePrice: Money.from(150),
        assetType: AssetType.Fii,
      }),
    );
    expect(result).toEqual({
      totalQuantity: '10',
      averagePrice: '150',
    });
  });

  it('uses the explicit assetType override when reprocessing a repaired ticker', async () => {
    const brokerId = Uuid.create();
    positionRepository.findByTickerAndYear.mockResolvedValue(
      AssetPosition.create({
        ticker: 'AAPL34',
        year: 2024,
        assetType: AssetType.Stock,
        totalQuantity: Quantity.from(10),
        averagePrice: Money.from(40),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(10) }],
      }),
    );
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2024-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'AAPL34',
        quantity: Quantity.from(10),
        unitPrice: Money.from(40),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    await useCase.execute({ ticker: 'AAPL34', year: 2024, assetType: AssetType.Bdr });

    expect(positionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        assetType: AssetType.Bdr,
      }),
    );
  });

  it('persists empty position when no transactions exist', async () => {
    transactionRepository.findByTicker.mockResolvedValue([]);
    positionRepository.findByTickerAndYear.mockResolvedValue(
      AssetPosition.create({
        ticker: 'VALE3',
        year: 2024,
        assetType: AssetType.Stock,
        totalQuantity: Quantity.from(0),
        averagePrice: Money.from(0),
        brokerBreakdown: [],
      }),
    );

    await useCase.execute({ ticker: 'VALE3', year: 2024 });
  });

  it('applies bonus correctly diluting average price', async () => {
    const brokerId = Uuid.create();
    positionRepository.findByTickerAndYear.mockResolvedValue(
      AssetPosition.create({
        ticker: 'ITSA4',
        year: 2024,
        assetType: AssetType.Stock,
        totalQuantity: Quantity.from(100),
        averagePrice: Money.from(10),
        brokerBreakdown: [{ brokerId, quantity: Quantity.from(100) }],
      }),
    );
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2024-01-01',
        type: TransactionType.InitialBalance,
        ticker: 'ITSA4',
        quantity: Quantity.from(100),
        unitPrice: Money.from(10),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
      Transaction.create({
        date: '2024-06-01',
        type: TransactionType.Bonus,
        ticker: 'ITSA4',
        quantity: Quantity.from(50),
        unitPrice: Money.from(0),
        fees: Money.from(0),
        brokerId,
        sourceType: SourceType.Manual,
      }),
    ]);

    const result = await useCase.execute({ ticker: 'ITSA4', year: 2024 });
    const expectedAveragePrice = Money.from(1000).divideBy(150);
    expect(positionRepository.save).toHaveBeenCalledTimes(1);
    expect(positionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        totalQuantity: Quantity.from(150),
        averagePrice: expectedAveragePrice,
      }),
    );
    expect(result).toEqual({
      totalQuantity: '150',
      averagePrice: expectedAveragePrice.getAmount(),
    });
  });
});
