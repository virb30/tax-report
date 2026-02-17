import { Broker } from "../../../domain/portfolio/entities/broker.entity";
import { BrokerRepository } from "../../repositories/broker.repository";
import { ListBrokersInput } from "./list-brokers.input";
import { BrokerOutput, ListBrokersOutput } from "./list-brokers.output";

export class ListBrokersUseCase {

  constructor(private readonly brokerRepository: BrokerRepository) {}

  async execute(query?: ListBrokersInput): Promise<ListBrokersOutput> {
    const brokers = query?.activeOnly
      ? await this.brokerRepository.findAllActive()
      : await this.brokerRepository.findAll();
    return { items: brokers.map(this.toOutput) };
  }

  private toOutput(broker: Broker): BrokerOutput {
    return {
      id: broker.id.value,
      name: broker.name,
      cnpj: broker.cnpj.value,
      code: broker.code,
      active: broker.isActive(),
    };
  }
}