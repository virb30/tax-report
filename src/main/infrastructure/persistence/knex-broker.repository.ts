import type { Knex } from 'knex';
import type { BrokerRepositoryPort } from '../../application/repositories/broker.repository';
import type { BrokerRecord } from '../../domain/portfolio/broker.entity';

type BrokerRow = {
  id: string;
  name: string;
  cnpj: string;
  code?: string;
  active?: number;
};

function mapRowToRecord(row: BrokerRow): BrokerRecord {
  return {
    id: row.id,
    name: row.name,
    cnpj: row.cnpj,
    code: row.code ?? row.id,
    active: row.active === undefined || row.active === 1,
  };
}

export class KnexBrokerRepository implements BrokerRepositoryPort {
  constructor(private readonly database: Knex) {}

  async findById(id: string): Promise<BrokerRecord | null> {
    const row = await this.database<BrokerRow>('brokers').where({ id }).first();
    return row ? mapRowToRecord(row) : null;
  }

  async findByName(name: string): Promise<BrokerRecord | null> {
    const row = await this.database<BrokerRow>('brokers').where({ name }).first();
    return row ? mapRowToRecord(row) : null;
  }

  async findByCode(code: string): Promise<BrokerRecord | null> {
    const row = await this.database<BrokerRow>('brokers').where({ code }).first();
    return row ? mapRowToRecord(row) : null;
  }

  async findAll(): Promise<BrokerRecord[]> {
    const rows = await this.database<BrokerRow>('brokers').select('*').orderBy('name', 'asc');
    return rows.map(mapRowToRecord);
  }

  async findAllActive(): Promise<BrokerRecord[]> {
    const rows = await this.database<BrokerRow>('brokers')
      .select('*')
      .where({ active: 1 })
      .orderBy('name', 'asc');
    return rows.map(mapRowToRecord);
  }

  async save(broker: BrokerRecord): Promise<void> {
    const code = broker.code ?? broker.id;
    const active = broker.active !== false ? 1 : 0;
    await this.database('brokers').insert({
      id: broker.id,
      name: broker.name,
      cnpj: broker.cnpj,
      code,
      active,
    });
  }

  async update(
    id: string,
    data: Partial<Pick<BrokerRecord, 'name' | 'cnpj' | 'code' | 'active'>>,
  ): Promise<void> {
    const updatePayload: Record<string, unknown> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.cnpj !== undefined) updatePayload.cnpj = data.cnpj;
    if (data.code !== undefined) updatePayload.code = data.code;
    if (data.active !== undefined) updatePayload.active = data.active ? 1 : 0;
    if (Object.keys(updatePayload).length === 0) return;
    await this.database('brokers').where({ id }).update(updatePayload);
  }
}
