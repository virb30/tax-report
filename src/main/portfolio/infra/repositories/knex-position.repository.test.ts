import type { Knex } from 'knex';
import { AssetType } from '../../../../shared/types/domain';
import { initializeDatabase, createDatabaseConnection } from '../../../app/infra/database/database';
import { AssetPosition } from '../../domain/entities/asset-position.entity';
import { Broker } from '../../domain/entities/broker.entity';
import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';
import { KnexBrokerRepository } from './knex-broker.repository';
import { KnexPositionRepository } from './knex-position.repository';
import { Quantity } from '../../domain/value-objects/quantity.vo';
import { Money } from '../../domain/value-objects/money.vo';

describe('KnexPositionRepository', () => {
  let database: Knex;
  let positionRepository: KnexPositionRepository;
  let brokerRepository: KnexBrokerRepository;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, false);
    positionRepository = new KnexPositionRepository(database);
    brokerRepository = new KnexBrokerRepository(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('replaces stale broker allocations when saving an existing position', async () => {
    const nuBroker = Broker.create({
      name: 'Nu Invest',
      cnpj: new Cnpj('11.111.111/0001-11'),
      code: 'NUTEST',
    });
    const xpBroker = Broker.create({
      name: 'XP Investimentos Test',
      cnpj: new Cnpj('22.222.222/0001-22'),
      code: 'XPTEST',
    });
    await brokerRepository.save(nuBroker);
    await brokerRepository.save(xpBroker);

    await positionRepository.save(
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2024,
        totalQuantity: Quantity.from(1),
        averagePrice: Money.from(20),
        brokerBreakdown: [{ brokerId: nuBroker.id, quantity: Quantity.from(1) }],
      }),
    );

    await positionRepository.save(
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2024,
        totalQuantity: Quantity.from(7),
        averagePrice: Money.from(21.43),
        brokerBreakdown: [{ brokerId: xpBroker.id, quantity: Quantity.from(7) }],
      }),
    );

    const position = await positionRepository.findByTickerAndYear('PETR4', 2024);

    expect(position?.totalQuantity.getAmount()).toBe(Quantity.from(7).getAmount());
    expect(position?.brokerBreakdown).toEqual([
      { brokerId: xpBroker.id, quantity: Quantity.from(7) },
    ]);
  });
});
