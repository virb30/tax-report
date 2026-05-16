import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';
import { DailyBrokerTax } from '../../domain/entities/daily-broker-tax.entity';
import type { BrokerRepository } from '../../../portfolio/application/repositories/broker.repository';
import type { DailyBrokerTaxRepository } from '../repositories/daily-broker-tax.repository';
import type { ReallocateTransactionFeesService } from '../services/reallocate-transaction-fees.service';
import type { DailyBrokerTaxItemOutput } from './list-daily-broker-taxes.use-case';
import type { Queue } from '../../../shared/infra/events/queue.interface';
import { TransactionFeesReallocatedEvent } from '../../../shared/domain/events/transaction-fees-reallocated.event';

export type SaveDailyBrokerTaxInput = {
  date: string;
  brokerId: string;
  fees: number;
  irrf: number;
};

export type SaveDailyBrokerTaxOutput = {
  tax: DailyBrokerTaxItemOutput;
  recalculatedTickers: string[];
};

export class SaveDailyBrokerTaxUseCase {
  constructor(
    private readonly dailyBrokerTaxRepository: DailyBrokerTaxRepository,
    private readonly brokerRepository: BrokerRepository,
    private readonly reallocateTransactionFeesService: ReallocateTransactionFeesService,
    private readonly queue: Queue,
  ) {}

  async execute(input: SaveDailyBrokerTaxInput): Promise<SaveDailyBrokerTaxOutput> {
    const brokerId = Uuid.from(input.brokerId);
    const broker = await this.brokerRepository.findById(brokerId);
    if (!broker) {
      throw new Error('Corretora nao encontrada para taxa diaria.');
    }

    const tax = DailyBrokerTax.create({
      date: input.date,
      brokerId,
      fees: Money.from(input.fees),
      irrf: Money.from(input.irrf),
    });

    await this.dailyBrokerTaxRepository.upsert(tax);
    const reallocation = await this.reallocateTransactionFeesService.execute({
      date: tax.date,
      brokerId: tax.brokerId.value,
    });
    for (const position of reallocation.affectedPositions) {
      await this.queue.publish(new TransactionFeesReallocatedEvent(position));
    }

    return {
      tax: {
        date: tax.date,
        brokerId: tax.brokerId.value,
        brokerCode: broker.code,
        brokerName: broker.name,
        fees: tax.fees.toNumber(),
        irrf: tax.irrf.toNumber(),
      },
      recalculatedTickers: reallocation.recalculatedTickers,
    };
  }
}
