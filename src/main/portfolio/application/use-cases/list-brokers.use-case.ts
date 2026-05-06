import type { Broker } from '../../domain/entities/broker.entity';
import type { BrokerRepository } from '../repositories/broker.repository';

export interface ListBrokersInput {
  activeOnly?: boolean;
}

export interface BrokerOutput {
  id: string;
  name: string;
  cnpj: string;
  code: string;
  active: boolean;
}

export interface ListBrokersOutput {
  items: BrokerOutput[];
}

export class ListBrokersUseCase {
  constructor(private readonly brokerRepository: BrokerRepository) {}

  async execute(query?: ListBrokersInput): Promise<ListBrokersOutput> {
    const brokers = query?.activeOnly
      ? await this.brokerRepository.findAllActive()
      : await this.brokerRepository.findAll();
    return { items: this.toOutput(brokers) };
  }

  private toOutput(brokers: Broker[]): BrokerOutput[] {
    return brokers.map((broker) => ({
      id: broker.id.value,
      name: broker.name,
      cnpj: broker.cnpj.value,
      code: broker.code,
      active: broker.isActive(),
    }));
  }
}
