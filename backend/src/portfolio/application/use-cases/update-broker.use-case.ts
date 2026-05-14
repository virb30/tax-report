import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import type { BrokerRepository } from '../repositories/broker.repository';

export interface UpdateBrokerInput {
  id: string;
  name?: string;
  cnpj?: string;
  code?: string;
}

export interface UpdateBrokerOutput {
  id: string;
  name: string;
  cnpj: string;
  code: string;
  active: boolean;
}

export class UpdateBrokerUseCase {
  constructor(private readonly brokerRepository: BrokerRepository) {}

  async execute(input: UpdateBrokerInput): Promise<UpdateBrokerOutput> {
    const id = Uuid.from(input.id);
    const broker = await this.brokerRepository.findById(id);
    if (!broker) {
      throw new Error('Corretora nao encontrada.');
    }

    if (input.name !== undefined) {
      broker.changeName(input.name);
    }

    if (input.cnpj !== undefined) {
      const cnpj = new Cnpj(input.cnpj);
      const existingByCnpj = await this.brokerRepository.findByCnpj(cnpj);
      if (existingByCnpj && !existingByCnpj.id.equals(broker.id)) {
        throw new Error('CNPJ ja cadastrado para outra corretora.');
      }
      broker.changeCnpj(new Cnpj(input.cnpj));
    }

    if (input.code !== undefined) {
      const existingByCode = await this.brokerRepository.findByCode(input.code);
      if (existingByCode && !existingByCode.id.equals(broker.id)) {
        throw new Error('Código ja cadastrado para outra corretora.');
      }
      broker.changeCode(input.code);
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
