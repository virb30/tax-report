import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import type { DailyBrokerTaxRepository } from '../repositories/daily-broker-tax.repository';
import type { ReallocateTransactionFeesService } from '../services/reallocate-transaction-fees.service';
import type { Queue } from '../../../shared/infra/events/queue.interface';
import { TransactionFeesReallocatedEvent } from '../../../shared/domain/events/transaction-fees-reallocated.event';

export type DeleteDailyBrokerTaxInput = {
  date: string;
  brokerId: string;
};

export type DeleteDailyBrokerTaxOutput = {
  deleted: boolean;
  recalculatedTickers: string[];
};

export class DeleteDailyBrokerTaxUseCase {
  constructor(
    private readonly dailyBrokerTaxRepository: DailyBrokerTaxRepository,
    private readonly reallocateTransactionFeesService: ReallocateTransactionFeesService,
    private readonly queue: Queue,
  ) {}

  async execute(input: DeleteDailyBrokerTaxInput): Promise<DeleteDailyBrokerTaxOutput> {
    const brokerId = Uuid.from(input.brokerId);
    const deleted = await this.dailyBrokerTaxRepository.deleteByDateAndBroker({
      date: input.date,
      brokerId,
    });
    const reallocation = await this.reallocateTransactionFeesService.execute({
      date: input.date,
      brokerId: brokerId.value,
    });
    for (const position of reallocation.affectedPositions) {
      await this.queue.publish(new TransactionFeesReallocatedEvent(position));
    }

    return {
      deleted,
      recalculatedTickers: reallocation.recalculatedTickers,
    };
  }
}
