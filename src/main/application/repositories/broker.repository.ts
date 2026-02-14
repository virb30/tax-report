import type { BrokerRecord } from '@main/domain/portfolio/broker.entity';

export interface BrokerRepositoryPort {
  findById(id: string): Promise<BrokerRecord | null>;
  findByName(name: string): Promise<BrokerRecord | null>;
  findAll(): Promise<BrokerRecord[]>;
  save(broker: BrokerRecord): Promise<void>;
}
