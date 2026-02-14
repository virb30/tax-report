import { randomUUID } from 'node:crypto';
import type { BrokerRepositoryPort } from '../repositories/broker.repository';
import type { BrokerRecord } from '@main/domain/portfolio/broker.entity';
import type { ListBrokersResult, CreateBrokerCommand, CreateBrokerResult } from '@shared/contracts/brokers.contract';

export class ManageBrokersUseCase {
  constructor(private readonly brokerRepository: BrokerRepositoryPort) {}

  async list(): Promise<ListBrokersResult> {
    const brokers = await this.brokerRepository.findAll();
    return {
      items: brokers.map((b) => ({ id: b.id, name: b.name, cnpj: b.cnpj })),
    };
  }

  async create(input: CreateBrokerCommand): Promise<CreateBrokerResult> {
    const trimmedName = input.name?.trim() ?? '';
    if (trimmedName.length === 0) {
      return { success: false, error: 'Nome da corretora e obrigatorio.' };
    }

    const trimmedCnpj = input.cnpj?.trim() ?? '';
    if (trimmedCnpj.length === 0) {
      return { success: false, error: 'CNPJ e obrigatorio.' };
    }

    const existingByCnpj = await this.brokerRepository.findAll();
    const duplicateCnpj = existingByCnpj.find(
      (b) => b.cnpj.replace(/\D/g, '') === trimmedCnpj.replace(/\D/g, ''),
    );
    if (duplicateCnpj) {
      return { success: false, error: 'CNPJ ja cadastrado para outra corretora.' };
    }

    const id = `broker-${randomUUID()}`;
    const record: BrokerRecord = {
      id,
      name: trimmedName,
      cnpj: this.formatCnpj(trimmedCnpj),
    };

    await this.brokerRepository.save(record);
    return {
      success: true,
      broker: { id: record.id, name: record.name, cnpj: record.cnpj },
    };
  }

  private formatCnpj(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 14) {
      return raw;
    }
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
}
