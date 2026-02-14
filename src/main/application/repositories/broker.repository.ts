import type { BrokerRecord } from '@main/domain/portfolio/broker.entity';

export interface BrokerRepositoryPort {
  findById(id: string): Promise<BrokerRecord | null>;
  findByName(name: string): Promise<BrokerRecord | null>;
  findByCode(codigo: string): Promise<BrokerRecord | null>;
  findAll(): Promise<BrokerRecord[]>;
  findAllActive(): Promise<BrokerRecord[]>;
  save(broker: BrokerRecord): Promise<void>;
  update(id: string, data: Partial<Pick<BrokerRecord, 'name' | 'cnpj' | 'code' | 'active'>>): Promise<void>;
}
