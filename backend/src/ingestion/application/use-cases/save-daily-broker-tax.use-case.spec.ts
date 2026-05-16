import { mock, mockReset } from 'jest-mock-extended';
import { SaveDailyBrokerTaxUseCase } from './save-daily-broker-tax.use-case';
import type { DailyBrokerTaxRepository } from '../repositories/daily-broker-tax.repository';
import type { BrokerRepository } from '../../../portfolio/application/repositories/broker.repository';
import type { ReallocateTransactionFeesService } from '../services/reallocate-transaction-fees.service';
import { Broker } from '../../../portfolio/domain/entities/broker.entity';
import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import type { Queue } from '../../../shared/infra/events/queue.interface';
import { TransactionFeesReallocatedEvent } from '../../../shared/domain/events/transaction-fees-reallocated.event';

describe('SaveDailyBrokerTaxUseCase', () => {
  const dailyBrokerTaxRepository = mock<DailyBrokerTaxRepository>();
  const brokerRepository = mock<BrokerRepository>();
  const reallocator = mock<ReallocateTransactionFeesService>();
  const queue = mock<Queue>();
  const broker = Broker.restore({
    id: Uuid.create(),
    name: 'XP',
    cnpj: new Cnpj('00.000.000/0001-00'),
    code: 'XP',
    active: true,
  });

  beforeEach(() => {
    mockReset(dailyBrokerTaxRepository);
    mockReset(brokerRepository);
    mockReset(reallocator);
    mockReset(queue);
    brokerRepository.findById.mockResolvedValue(broker);
    dailyBrokerTaxRepository.upsert.mockResolvedValue(undefined);
    reallocator.execute.mockResolvedValue({
      recalculatedTickers: ['PETR4'],
      affectedPositions: [{ ticker: 'PETR4', year: 2025 }],
    });
    queue.publish.mockResolvedValue(undefined);
  });

  it('upserts by date and broker and re-rates existing transactions', async () => {
    const useCase = new SaveDailyBrokerTaxUseCase(
      dailyBrokerTaxRepository,
      brokerRepository,
      reallocator,
      queue,
    );

    const result = await useCase.execute({
      date: '2025-04-01',
      brokerId: broker.id.value,
      fees: 1.23,
      irrf: 0.01,
    });

    expect(dailyBrokerTaxRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2025-04-01',
        brokerId: broker.id,
      }),
    );
    expect(reallocator.execute).toHaveBeenCalledWith({
      date: '2025-04-01',
      brokerId: broker.id.value,
    });
    expect(result).toEqual({
      tax: {
        date: '2025-04-01',
        brokerId: broker.id.value,
        brokerCode: 'XP',
        brokerName: 'XP',
        fees: 1.23,
        irrf: 0.01,
      },
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
