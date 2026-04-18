import type { Knex } from 'knex';
import type { BrokerRepository } from '../../application/repositories/broker.repository';
import { Broker } from '../../domain/portfolio/entities/broker.entity';
import { Uuid } from '../../domain/shared/uuid.vo';
import { Cnpj } from '../../domain/shared/cnpj.vo';

type BrokerRow = {
  id: string;
  name: string;
  cnpj: string;
  code?: string;
  active?: number;
};

function toDomain(row: BrokerRow): Broker {
  return Broker.restore({
    id: Uuid.from(row.id),
    name: row.name,
    cnpj: new Cnpj(row.cnpj),
    code: row.code ?? '',
    active: row.active === 1,
  });
}

export class KnexBrokerRepository implements BrokerRepository {
  constructor(private readonly database: Knex) {}

  async findById(id: Uuid): Promise<Broker | null> {
    const row = await this.database<BrokerRow>('brokers').where({ id: id.value }).first();
    return row ? toDomain(row) : null;
  }

  async findByName(name: string): Promise<Broker | null> {
    const row = await this.database<BrokerRow>('brokers').where({ name }).first();
    return row ? toDomain(row) : null;
  }

  async findByCode(code: string): Promise<Broker | null> {
    const row = await this.database<BrokerRow>('brokers').where({ code }).first();
    return row ? toDomain(row) : null;
  }

  async findAllByCodes(codes: string[]): Promise<Broker[]> {
    const rows = await this.database<BrokerRow>('brokers').whereIn('code', codes).orderBy('name', 'asc');
    return rows.map(toDomain);
  }

  async findByCnpj(cnpj: Cnpj): Promise<Broker | null> {
    const row = await this.database<BrokerRow>('brokers').where({ cnpj: cnpj.value }).first();
    return row ? toDomain(row) : null;
  }

  async findAll(): Promise<Broker[]> {
    const rows = await this.database<BrokerRow>('brokers').select('*').orderBy('name', 'asc');
    return rows.map(toDomain);
  }

  async findAllActive(): Promise<Broker[]> {
    const rows = await this.database<BrokerRow>('brokers')
      .select('*')
      .where({ active: 1 })
      .orderBy('name', 'asc');
    return rows.map(toDomain);
  }

  async save(broker: Broker): Promise<void> {
    const code = broker.code ?? broker.id.value;
    const active = broker.isActive() ? 1 : 0;
    await this.database('brokers').insert({
      id: broker.id.value,
      name: broker.name,
      cnpj: broker.cnpj.value,
      code,
      active,
    });
  }

  async update(broker: Broker): Promise<void> {
    const updatePayload: Record<string, unknown> = {
      id: broker.id.value,
      name: broker.name,
      cnpj: broker.cnpj.value,
      code: broker.code,
      active: broker.isActive(),
    };
    await this.database('brokers').where({ id: broker.id.value }).update(updatePayload);
  }
}
