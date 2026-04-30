import { mock, mockReset } from 'jest-mock-extended';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import type { InitialBalanceDocumentPositionSyncService } from '../../services/initial-balance-document-position-sync.service';
import { DeleteInitialBalanceDocumentUseCase } from './delete-initial-balance-document.use-case';

describe('DeleteInitialBalanceDocumentUseCase', () => {
  const transactionRepository = mock<TransactionRepository>();
  const positionSyncService = mock<InitialBalanceDocumentPositionSyncService>();
  let useCase: DeleteInitialBalanceDocumentUseCase;

  beforeEach(() => {
    mockReset(transactionRepository);
    mockReset(positionSyncService);
    transactionRepository.findInitialBalanceDocumentByTickerAndYear.mockClear();
    transactionRepository.deleteInitialBalanceByTickerAndYear.mockClear();
    positionSyncService.sync.mockClear();
    transactionRepository.findInitialBalanceDocumentByTickerAndYear.mockResolvedValue({
      ticker: 'PETR4',
      year: 2025,
      averagePrice: 21,
      totalQuantity: 10,
      allocations: [{ brokerId: 'broker-xp', quantity: 10 }],
    });
    transactionRepository.deleteInitialBalanceByTickerAndYear.mockResolvedValue(undefined);
    positionSyncService.sync.mockResolvedValue({
      totalQuantity: 0,
      averagePrice: 0,
    });
    useCase = new DeleteInitialBalanceDocumentUseCase(transactionRepository, positionSyncService);
  });

  it('deletes grouped rows and triggers recalculation', async () => {
    await expect(useCase.execute({ ticker: 'PETR4', year: 2025 })).resolves.toEqual({
      deleted: true,
    });

    expect(transactionRepository.deleteInitialBalanceByTickerAndYear).toHaveBeenCalledWith(
      'PETR4',
      2025,
    );
    expect(positionSyncService.sync).toHaveBeenCalledWith({
      ticker: 'PETR4',
      year: 2025,
    });
  });

  it('returns deleted false when the document does not exist', async () => {
    transactionRepository.findInitialBalanceDocumentByTickerAndYear.mockResolvedValueOnce(null);

    await expect(useCase.execute({ ticker: 'PETR4', year: 2025 })).resolves.toEqual({
      deleted: false,
    });

    expect(transactionRepository.deleteInitialBalanceByTickerAndYear).not.toHaveBeenCalled();
  });
});
