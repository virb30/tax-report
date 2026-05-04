import type { BrokerRepository } from '../../../../portfolio/application/repositories/broker.repository';
import type { DailyBrokerTaxRepository } from '../../repositories/daily-broker-tax.repository';
import type { ListDailyBrokerTaxesOutput } from './list-daily-broker-taxes.output';

export class ListDailyBrokerTaxesUseCase {
  constructor(
    private readonly dailyBrokerTaxRepository: DailyBrokerTaxRepository,
    private readonly brokerRepository: BrokerRepository,
  ) {}

  async execute(): Promise<ListDailyBrokerTaxesOutput> {
    const [taxes, brokers] = await Promise.all([
      this.dailyBrokerTaxRepository.findAll(),
      this.brokerRepository.findAll(),
    ]);
    const brokerMap = new Map(brokers.map((broker) => [broker.id.value, broker]));

    return {
      items: taxes.map((tax) => {
        const broker = brokerMap.get(tax.brokerId.value);
        return {
          date: tax.date,
          brokerId: tax.brokerId.value,
          brokerCode: broker?.code ?? tax.brokerId.value,
          brokerName: broker?.name ?? tax.brokerId.value,
          fees: tax.fees.toNumber(),
          irrf: tax.irrf.toNumber(),
        };
      }),
    };
  }
}
