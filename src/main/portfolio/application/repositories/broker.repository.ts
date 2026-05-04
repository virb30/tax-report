import type { Broker } from '../../domain/entities/broker.entity';
import type { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';
import type { Uuid } from '../../../shared/domain/value-objects/uuid.vo';

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
