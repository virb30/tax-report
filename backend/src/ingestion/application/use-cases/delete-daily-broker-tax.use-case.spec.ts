import { mock, mockReset } from 'jest-mock-extended';
import { DeleteDailyBrokerTaxUseCase } from './delete-daily-broker-tax.use-case';
import type { DailyBrokerTaxRepository } from '../repositories/daily-broker-tax.repository';
import type { ReallocateTransactionFeesService } from '../services/reallocate-transaction-fees.service';
import type { Queue } from '../../../shared/infra/events/queue.interface';
import { TransactionFeesReallocatedEvent } from '../../../shared/domain/events/transaction-fees-reallocated.event';

describe('DeleteDailyBrokerTaxUseCase', () => {
  const dailyBrokerTaxRepository = mock<DailyBrokerTaxRepository>();
  const reallocator = mock<ReallocateTransactionFeesService>();
  const queue = mock<Queue>();

  beforeEach(() => {
    mockReset(dailyBrokerTaxRepository);
    mockReset(reallocator);
    mockReset(queue);
    dailyBrokerTaxRepository.deleteByDateAndBroker.mockResolvedValue(true);
    reallocator.execute.mockResolvedValue({
      recalculatedTickers: ['PETR4'],
      affectedPositions: [{ ticker: 'PETR4', year: 2025 }],
    });
    queue.publish.mockResolvedValue(undefined);
  });

  it('deletes the daily tax and re-rates transactions with zero fees', async () => {
    const brokerId = '019cece0-4a22-75b8-95c4-45eb6f4cb2f4';
    const useCase = new DeleteDailyBrokerTaxUseCase(dailyBrokerTaxRepository, reallocator, queue);

    const result = await useCase.execute({
      date: '2025-04-01',
      brokerId,
    });

    expect(reallocator.execute).toHaveBeenCalledWith({
      date: '2025-04-01',
      brokerId,
    });
    expect(result).toEqual({
      deleted: true,
      recalculatedTickers: ['PETR4'],
    });
    expect(queue.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TransactionFeesReallocatedEvent.name,
        ticker: 'PETR4',
        year: 2025,
      }),
    );
  });
});
