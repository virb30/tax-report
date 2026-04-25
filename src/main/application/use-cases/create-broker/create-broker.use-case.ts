import { Broker } from '../../../domain/portfolio/entities/broker.entity';
import { Cnpj } from '../../../domain/shared/cnpj.vo';
import type { BrokerRepository } from '../../repositories/broker.repository';
import type { CreateBrokerInput } from './create-broker.input';
import type { CreateBrokerOutput } from './create-broker.output';

export class CreateBrokerUseCase {
  constructor(private readonly brokerRepository: BrokerRepository) {}

  async execute(input: CreateBrokerInput): Promise<CreateBrokerOutput> {
    const cnpj = new Cnpj(input.cnpj);
    const broker = Broker.create({
      name: input.name,
      cnpj,
      code: input.code,
    });
    const existingByCode = await this.brokerRepository.findByCode(broker.code);
    if (existingByCode) {
      throw new Error('Código já cadastrado para outra corretora.');
    }

    const existingByCnpj = await this.brokerRepository.findByCnpj(broker.cnpj);
    if (existingByCnpj) {
      throw new Error('CNPJ já cadastrado para outra corretora.');
    }

    await this.brokerRepository.save(broker);
    return {
      id: broker.id.value,
      name: broker.name,
      cnpj: broker.cnpj.value,
      code: broker.code,
      active: broker.isActive(),
    };
  }
}
