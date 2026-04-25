import { Uuid } from '../../../domain/shared/uuid.vo';
import type { BrokerRepository } from '../../repositories/broker.repository';
import type { ToggleActiveBrokerInput } from './toggle-active-broker.input';
import type { ToggleActiveBrokerOutput } from './toggle-active-broker.output';

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