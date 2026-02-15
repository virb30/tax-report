import { Broker } from '@main/domain/portfolio/broker.entity';
import { Cnpj } from '@main/domain/shared/cnpj.vo';

export interface BrokerRepository {
  findById(id: Uuid): Promise<Broker | null>;
  findByName(name: string): Promise<Broker | null>;
  findByCode(codigo: string): Promise<Broker | null>;
  findByCnpj(cnpj: Cnpj): Promise<Broker | null>;
  findAll(): Promise<Broker[]>;
  findAllActive(): Promise<Broker[]>;
  save(broker: Broker): Promise<void>;
  update(broker: Broker): Promise<void>;
}
