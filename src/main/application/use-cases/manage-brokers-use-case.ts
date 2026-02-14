import { randomUUID } from 'node:crypto';
import type { BrokerRepositoryPort } from '../repositories/broker.repository';
import type { BrokerRecord } from '@main/domain/portfolio/broker.entity';
import type {
  ListBrokersResult,
  ListBrokersQuery,
  CreateBrokerCommand,
  CreateBrokerResult,
  UpdateBrokerCommand,
  UpdateBrokerResult,
  ToggleBrokerActiveCommand,
  ToggleBrokerActiveResult,
} from '@shared/contracts/brokers.contract';

function toListItem(b: BrokerRecord): ListBrokersResult['items'][number] {
  return { id: b.id, name: b.name, cnpj: b.cnpj, code: b.code, active: b.active };
}

export class ManageBrokersUseCase {
  constructor(private readonly brokerRepository: BrokerRepositoryPort) {}

  async list(query?: ListBrokersQuery): Promise<ListBrokersResult> {
    const brokers = query?.activeOnly
      ? await this.brokerRepository.findAllActive()
      : await this.brokerRepository.findAll();
    return { items: brokers.map(toListItem) };
  }

  async create(input: CreateBrokerCommand): Promise<CreateBrokerResult> {
    const createInput = input as CreateBrokerCommand & { codigo?: string };
    const trimmedName = input.name?.trim() ?? '';
    if (trimmedName.length === 0) {
      return { success: false, error: 'Nome da corretora e obrigatorio.' };
    }

    const trimmedCnpj = input.cnpj?.trim() ?? '';
    if (trimmedCnpj.length === 0) {
      return { success: false, error: 'CNPJ e obrigatorio.' };
    }

    const trimmedCode =
      (input.code?.trim() ?? createInput.codigo?.trim() ?? '').toUpperCase();
    if (trimmedCode.length === 0) {
      return { success: false, error: 'Codigo da corretora e obrigatorio.' };
    }

    const existingByCode = await this.brokerRepository.findByCode(trimmedCode);
    if (existingByCode) {
      return { success: false, error: 'Codigo ja cadastrado para outra corretora.' };
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
      code: trimmedCode,
      active: true,
    };

    await this.brokerRepository.save(record);
    return { success: true, broker: toListItem(record) };
  }

  async update(input: UpdateBrokerCommand): Promise<UpdateBrokerResult> {
    const existing = await this.brokerRepository.findById(input.id);
    if (!existing) {
      return { success: false, error: 'Corretora nao encontrada.' };
    }

    const updates: Partial<Pick<BrokerRecord, 'name' | 'cnpj' | 'code'>> = {};
    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (trimmedName.length === 0) {
        return { success: false, error: 'Nome da corretora nao pode ser vazio.' };
      }
      updates.name = trimmedName;
    }
    if (input.cnpj !== undefined) {
      const trimmedCnpj = input.cnpj.trim();
      if (trimmedCnpj.length === 0) {
        return { success: false, error: 'CNPJ nao pode ser vazio.' };
      }
      const formattedCnpj = this.formatCnpj(trimmedCnpj);
      const allBrokers = await this.brokerRepository.findAll();
      const duplicateCnpj = allBrokers.find(
        (b) => b.id !== input.id && b.cnpj.replace(/\D/g, '') === trimmedCnpj.replace(/\D/g, ''),
      );
      if (duplicateCnpj) {
        return { success: false, error: 'CNPJ ja cadastrado para outra corretora.' };
      }
      updates.cnpj = formattedCnpj;
    }
    if (input.code !== undefined) {
      const trimmedCode = input.code.trim().toUpperCase();
      if (trimmedCode.length === 0) {
        return { success: false, error: 'Codigo da corretora nao pode ser vazio.' };
      }
      const existingByCode = await this.brokerRepository.findByCode(trimmedCode);
      if (existingByCode && existingByCode.id !== input.id) {
        return { success: false, error: 'Codigo ja cadastrado para outra corretora.' };
      }
      updates.code = trimmedCode;
    }

    if (Object.keys(updates).length === 0) {
      return { success: true, broker: toListItem(existing) };
    }

    await this.brokerRepository.update(input.id, updates);
    const updated = await this.brokerRepository.findById(input.id);
    return { success: true, broker: toListItem(updated!) };
  }

  async toggleActive(input: ToggleBrokerActiveCommand): Promise<ToggleBrokerActiveResult> {
    const existing = await this.brokerRepository.findById(input.id);
    if (!existing) {
      return { success: false, error: 'Corretora nao encontrada.' };
    }
    const newActive = !existing.active;
    await this.brokerRepository.update(input.id, { active: newActive });
    const updated = await this.brokerRepository.findById(input.id);
    return { success: true, broker: toListItem(updated!) };
  }

  private formatCnpj(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 14) {
      return raw;
    }
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
}
