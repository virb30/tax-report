import type { Knex } from 'knex';
import type { BrokerRepositoryPort } from '../../application/repositories/broker.repository';
import type { BrokerRecord } from '../../domain/portfolio/broker.entity';

type BrokerRow = {
  id: string;
  name: string;
  cnpj: string;
};

function mapRowToRecord(row: BrokerRow): BrokerRecord {
  return {
    id: row.id,
    name: row.name,
    cnpj: row.cnpj,
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

  async findAll(): Promise<BrokerRecord[]> {
    const rows = await this.database<BrokerRow>('brokers').select('*').orderBy('name', 'asc');
    return rows.map(mapRowToRecord);
  }

  async save(broker: BrokerRecord): Promise<void> {
    await this.database('brokers').insert({
      id: broker.id,
      name: broker.name,
      cnpj: broker.cnpj,
    });
  }
}
