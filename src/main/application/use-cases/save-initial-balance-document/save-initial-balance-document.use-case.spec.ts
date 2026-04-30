import { mock, mockReset } from 'jest-mock-extended';
import { AssetType } from '../../../../shared/types/domain';
import { Money } from '../../../domain/portfolio/value-objects/money.vo';
import { Quantity } from '../../../domain/portfolio/value-objects/quantity.vo';
import { Uuid } from '../../../domain/shared/uuid.vo';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import type { InitialBalanceDocumentPositionSyncService } from '../../services/initial-balance-document-position-sync.service';
import { SaveInitialBalanceDocumentUseCase } from './save-initial-balance-document.use-case';

describe('SaveInitialBalanceDocumentUseCase', () => {
  const transactionRepository = mock<TransactionRepository>();
  const positionSyncService = mock<InitialBalanceDocumentPositionSyncService>();
  let useCase: SaveInitialBalanceDocumentUseCase;

  beforeEach(() => {
    mockReset(transactionRepository);
    mockReset(positionSyncService);
    transactionRepository.replaceInitialBalanceTransactionsForTickerAndYear.mockClear();
    positionSyncService.sync.mockClear();
    transactionRepository.replaceInitialBalanceTransactionsForTickerAndYear.mockResolvedValue(
      undefined,
    );
    positionSyncService.sync.mockResolvedValue({
      totalQuantity: Quantity.from(15),
      averagePrice: Money.from(21),
    });
    useCase = new SaveInitialBalanceDocumentUseCase(transactionRepository, positionSyncService);
  });

  it('replaces all prior rows for the same ticker and year and returns the grouped document', async () => {
    const xpBrokerId = Uuid.create().value;
    const clearBrokerId = Uuid.create().value;

    const result = await useCase.execute({
      ticker: 'PETR4',
      year: 2025,
      assetType: AssetType.Stock,
      averagePrice: '21',
      allocations: [
        { brokerId: xpBrokerId, quantity: '10' },
        { brokerId: clearBrokerId, quantity: '5' },
      ],
    });

    expect(
      transactionRepository.replaceInitialBalanceTransactionsForTickerAndYear,
    ).toHaveBeenCalledWith(
      'PETR4',
      2025,
      expect.arrayContaining([
        expect.objectContaining({
          ticker: 'PETR4',
          quantity: 10,
          unitPrice: 21,
          date: '2025-01-01',
        }),
        expect.objectContaining({
          ticker: 'PETR4',
          quantity: 5,
          unitPrice: 21,
          date: '2025-01-01',
        }),
      ]),
    );
    expect(positionSyncService.sync).toHaveBeenCalledWith({
      ticker: 'PETR4',
      year: 2025,
      assetType: AssetType.Stock,
    });
    expect(result).toEqual({
      ticker: 'PETR4',
      year: 2025,
      assetType: AssetType.Stock,
      averagePrice: 21,
      allocations: [
        { brokerId: xpBrokerId, quantity: 10 },
        { brokerId: clearBrokerId, quantity: 5 },
      ],
      totalQuantity: 15,
    });
  });

  it('rejects zero or negative allocation quantities', async () => {
    const xpBrokerId = Uuid.create().value;

    await expect(
      useCase.execute({
        ticker: 'PETR4',
        year: 2025,
        assetType: AssetType.Stock,
        averagePrice: '21',
        allocations: [{ brokerId: xpBrokerId, quantity: '0' }],
      }),
    ).rejects.toThrow('Quantidade deve ser maior que zero.');

    expect(
      transactionRepository.replaceInitialBalanceTransactionsForTickerAndYear,
    ).not.toHaveBeenCalled();
  });
});
