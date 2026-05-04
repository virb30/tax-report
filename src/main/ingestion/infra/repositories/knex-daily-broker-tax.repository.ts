import type { Knex } from 'knex';
import type { DailyBrokerTaxRepository } from '../../application/repositories/daily-broker-tax.repository';
import { DailyBrokerTax } from '../../domain/entities/daily-broker-tax.entity';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';

type DailyBrokerTaxRow = {
  date: string;
  broker_id: string;
  fees: string;
  irrf: string;
};

function toPersistence(tax: DailyBrokerTax): Record<string, unknown> {
  return {
    date: tax.date,
    broker_id: tax.brokerId.value,
    fees: tax.fees.getAmount(),
    irrf: tax.irrf.getAmount(),
    updated_at: new Date().toISOString(),
  };
}

function toDomain(row: DailyBrokerTaxRow): DailyBrokerTax {
  return DailyBrokerTax.restore({
    date: row.date,
    brokerId: Uuid.from(row.broker_id),
    fees: Money.from(row.fees),
    irrf: Money.from(row.irrf),
  });
}

export class KnexDailyBrokerTaxRepository implements DailyBrokerTaxRepository {
  constructor(private readonly database: Knex) {}

  async findAll(): Promise<DailyBrokerTax[]> {
    const rows = await this.database<DailyBrokerTaxRow>('daily_broker_taxes')
      .select('date', 'broker_id', 'fees', 'irrf')
      .orderBy('date', 'desc')
      .orderBy('broker_id', 'asc');

    return rows.map(toDomain);
  }

  async findByDateAndBroker(input: {
    date: string;
    brokerId: Uuid;
  }): Promise<DailyBrokerTax | null> {
    const row = await this.database<DailyBrokerTaxRow>('daily_broker_taxes')
      .where({ date: input.date, broker_id: input.brokerId.value })
      .first('date', 'broker_id', 'fees', 'irrf');

    return row ? toDomain(row) : null;
  }

  async upsert(tax: DailyBrokerTax): Promise<void> {
    const row = toPersistence(tax);
    await this.database('daily_broker_taxes')
      .insert({ ...row, created_at: new Date().toISOString() })
      .onConflict(['date', 'broker_id'])
      .merge({
        fees: row.fees,
        irrf: row.irrf,
        updated_at: row.updated_at,
      });
  }

  async deleteByDateAndBroker(input: { date: string; brokerId: Uuid }): Promise<boolean> {
    const deletedRows = await this.database('daily_broker_taxes')
      .where({ date: input.date, broker_id: input.brokerId.value })
      .delete();

    return deletedRows > 0;
  }
}
