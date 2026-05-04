import type { DailyBrokerTax } from '../../domain/entities/daily-broker-tax.entity';
import type { Uuid } from '../../../shared/domain/value-objects/uuid.vo';

export interface DailyBrokerTaxRepository {
  findAll(): Promise<DailyBrokerTax[]>;
  findByDateAndBroker(input: { date: string; brokerId: Uuid }): Promise<DailyBrokerTax | null>;
  upsert(tax: DailyBrokerTax): Promise<void>;
  deleteByDateAndBroker(input: { date: string; brokerId: Uuid }): Promise<boolean>;
}
