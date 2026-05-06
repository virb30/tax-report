import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import type { BrokerRepository } from '../repositories/broker.repository';

export interface ToggleActiveBrokerInput {
  id: string;
}

export interface ToggleActiveBrokerOutput {
  id: string;
  name: string;
  cnpj: string;
  code: string;
  active: boolean;
}

export class ToggleActiveBrokerUseCase {
  constructor(private readonly brokerRepository: BrokerRepository) {}

  async execute(input: ToggleActiveBrokerInput): Promise<ToggleActiveBrokerOutput> {
    const id = Uuid.from(input.id);
    const broker = await this.brokerRepository.findById(id);
    if (!broker) {
      throw new Error('Corretora nao encontrada.');
    }

    if (broker.isActive()) {
      broker.deactivate();
    } else {
      broker.activate();
    }

    await this.brokerRepository.update(broker);
    return {
      id: broker.id.value,
      name: broker.name,
      cnpj: broker.cnpj.value,
      code: broker.code,
      active: broker.isActive(),
    };
  }
}
