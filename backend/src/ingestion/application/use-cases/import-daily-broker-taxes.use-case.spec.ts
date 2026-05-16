import { mock, mockReset } from 'jest-mock-extended';
import { ImportDailyBrokerTaxesUseCase } from './import-daily-broker-taxes.use-case';
import type { DailyBrokerTaxesParser } from '../interfaces/daily-broker-taxes.parser.interface';
import type { DailyBrokerTaxRepository } from '../repositories/daily-broker-tax.repository';
import type { ReallocateTransactionFeesService } from '../services/reallocate-transaction-fees.service';
import type { Queue } from '../../../shared/infra/events/queue.interface';
import { TransactionFeesReallocatedEvent } from '../../../shared/domain/events/transaction-fees-reallocated.event';

describe('ImportDailyBrokerTaxesUseCase', () => {
  const parser = mock<DailyBrokerTaxesParser>();
  const repository = mock<DailyBrokerTaxRepository>();
  const reallocator = mock<ReallocateTransactionFeesService>();
  const queue = mock<Queue>();
  const brokerId = '019cece0-4a22-75b8-95c4-45eb6f4cb2f4';

  beforeEach(() => {
    mockReset(parser);
    mockReset(repository);
    mockReset(reallocator);
    mockReset(queue);
    repository.upsert.mockResolvedValue(undefined);
    reallocator.execute.mockResolvedValue({
      recalculatedTickers: ['PETR4'],
      affectedPositions: [{ ticker: 'PETR4', year: 2025 }],
    });
    queue.publish.mockResolvedValue(undefined);
  });

  it('imports daily taxes and keeps the last duplicate date and broker row', async () => {
    parser.parse.mockResolvedValue({
      taxes: [
        { date: '2025-04-01', brokerId, fees: 1, irrf: 0.01 },
        { date: '2025-04-01', brokerId, fees: 2, irrf: 0.02 },
      ],
    });
    const useCase = new ImportDailyBrokerTaxesUseCase(parser, repository, reallocator, queue);

    const result = await useCase.execute({ filePath: '/tmp/taxes.csv' });

    expect(repository.upsert).toHaveBeenCalledTimes(1);
    const savedTax = repository.upsert.mock.calls[0]?.[0];
    expect(savedTax?.date).toBe('2025-04-01');
    expect(savedTax?.fees.toNumber()).toBe(2);
    expect(reallocator.execute).toHaveBeenCalledWith({
      date: '2025-04-01',
      brokerId,
    });
    expect(result).toEqual({
      importedCount: 1,
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
