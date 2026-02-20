import { Broker } from '@main/domain/portfolio/entities/broker.entity';
import { Cnpj } from '@main/domain/shared/cnpj.vo';
import { Uuid } from '@main/domain/shared/uuid.vo';

export interface BrokerRepository {
  findById(id: Uuid): Promise<Broker | null>;
  findByName(name: string): Promise<Broker | null>;
  findByCode(codigo: string): Promise<Broker | null>;
  findByCnpj(cnpj: Cnpj): Promise<Broker | null>;
  findAllByCodes(codes: string[]): Promise<Broker[]>;
  findAll(): Promise<Broker[]>;
  findAllActive(): Promise<Broker[]>;
  save(broker: Broker): Promise<void>;
  update(broker: Broker): Promise<void>;
}
