import type { Knex } from 'knex';
import { createDatabaseConnection, initializeDatabase } from '../../../app/infra/database/database';
import { DailyBrokerTax } from '../../domain/entities/daily-broker-tax.entity';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { KnexDailyBrokerTaxRepository } from './knex-daily-broker-tax.repository';

function createDailyBrokerTax(input: {
  date: string;
  brokerId: Uuid;
  fees: string;
  irrf: string;
}): DailyBrokerTax {
  return DailyBrokerTax.create({
    date: input.date,
    brokerId: input.brokerId,
    fees: Money.from(input.fees),
    irrf: Money.from(input.irrf),
  });
}

describe('KnexDailyBrokerTaxRepository', () => {
  let database: Knex;
  let repository: KnexDailyBrokerTaxRepository;
  let brokerId: Uuid;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, false);
    repository = new KnexDailyBrokerTaxRepository(database);
    brokerId = Uuid.create();

    await database('brokers').insert({
      id: brokerId.value,
      name: 'Test Broker',
      cnpj: '12.345.678/0001-90',
    });
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('returns only daily broker taxes within the requested period inclusively', async () => {
    await repository.upsert(
      createDailyBrokerTax({
        date: '2026-01-31',
        brokerId,
        fees: '1.00',
        irrf: '0.10',
      }),
    );
    await repository.upsert(
      createDailyBrokerTax({
        date: '2026-02-01',
        brokerId,
        fees: '2.00',
        irrf: '0.20',
      }),
    );
    await repository.upsert(
      createDailyBrokerTax({
        date: '2026-02-15',
        brokerId,
        fees: '3.00',
        irrf: '0.30',
      }),
    );
    await repository.upsert(
      createDailyBrokerTax({
        date: '2026-02-28',
        brokerId,
        fees: '4.00',
        irrf: '0.40',
      }),
    );
    await repository.upsert(
      createDailyBrokerTax({
        date: '2026-03-01',
        brokerId,
        fees: '5.00',
        irrf: '0.50',
      }),
    );

    const result = await repository.findByPeriod({
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });

    expect(result.map((tax) => tax.date)).toEqual(['2026-02-01', '2026-02-15', '2026-02-28']);
    expect(result.map((tax) => tax.fees.toCurrency())).toEqual(['2.00', '3.00', '4.00']);
    expect(result.map((tax) => tax.irrf.toCurrency())).toEqual(['0.20', '0.30', '0.40']);
  });
});
