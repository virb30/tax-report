import type { Knex } from 'knex';
import { createDatabaseConnection } from '../../../app/infra/database/database-connection';
import { initializeDatabase } from '../../../app/infra/database/database';
import { KnexBrokerRepository } from './knex-broker.repository';
import { Broker } from '../../domain/entities/broker.entity';
import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';

describe('KnexBrokerRepository', () => {
  let database: Knex;

  afterEach(async () => {
    if (database) {
      await database.destroy();
    }
  });

  async function setupDatabase(): Promise<Knex> {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, false);
    await database.raw('DELETE FROM brokers');
    return database;
  }

  it('saves and finds broker by id', async () => {
    await setupDatabase();
    const repo = new KnexBrokerRepository(database);

    const broker = Broker.create({
      name: 'Test Broker',
      cnpj: new Cnpj('11.222.333/0001-44'),
      code: 'TEST',
    });
    await repo.save(broker);

    const found = await repo.findById(broker.id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Test Broker');
    expect(found?.cnpj.value).toBe('11.222.333/0001-44');
  });

  it('returns null when broker does not exist', async () => {
    await setupDatabase();
    const repo = new KnexBrokerRepository(database);

    const broker = Broker.create({
      name: 'Test Broker',
      cnpj: new Cnpj('11.222.333/0001-44'),
      code: 'TEST',
    });
    await repo.save(broker);

    const found = await repo.findById(Uuid.create());
    expect(found).toBeNull();
  });

  it('finds broker by name', async () => {
    await setupDatabase();
    const repo = new KnexBrokerRepository(database);

    const broker = Broker.create({
      name: 'Unique Name',
      cnpj: new Cnpj('11.111.111/0001-11'),
      code: 'UNIQ',
    });
    await repo.save(broker);

    const found = await repo.findByName('Unique Name');
    expect(found).not.toBeNull();
    expect(found?.id.value).toEqual(broker.id.value);
  });

  it('returns all brokers ordered by name', async () => {
    await setupDatabase();
    const repo = new KnexBrokerRepository(database);
    const broker1 = Broker.create({
      name: 'Zebra',
      cnpj: new Cnpj('99.999.999/0001-99'),
      code: 'ZEBRA',
    });
    const broker2 = Broker.create({
      name: 'Alpha',
      cnpj: new Cnpj('11.111.111/0001-11'),
      code: 'ALPHA',
    });
    const broker3 = Broker.create({
      name: 'Middle',
      cnpj: new Cnpj('55.555.555/0001-55'),
      code: 'MID',
    });

    await repo.save(broker1);
    await repo.save(broker2);
    await repo.save(broker3);

    const all = await repo.findAll();
    expect(all).toHaveLength(3);
    expect(all[0]?.name).toBe('Alpha');
    expect(all[1]?.name).toBe('Middle');
    expect(all[2]?.name).toBe('Zebra');
  });

  it('findAllActive returns only active brokers', async () => {
    await setupDatabase();
    const repo = new KnexBrokerRepository(database);
    const broker1 = Broker.create({
      name: 'Active Broker',
      cnpj: new Cnpj('11.111.111/0001-11'),
      code: 'ACTIVE',
    });
    const broker2 = Broker.create({
      name: 'Inactive Broker',
      cnpj: new Cnpj('22.222.222/0001-22'),
      code: 'INACTIVE',
    });
    broker2.deactivate();

    await repo.save(broker1);
    await repo.save(broker2);

    const active = await repo.findAllActive();
    expect(active).toHaveLength(1);
    expect(active[0]?.code).toBe('ACTIVE');
  });

  it('update modifies broker fields', async () => {
    await setupDatabase();
    const repo = new KnexBrokerRepository(database);
    const broker = Broker.create({
      name: 'Original',
      cnpj: new Cnpj('11.111.111/0001-11'),
      code: 'ORIG',
    });

    await repo.save(broker);

    const original = await repo.findById(broker.id);
    expect(original?.name).toBe('Original');
    expect(original?.code).toBe('ORIG');
    expect(original?.isActive()).toBe(true);

    broker.changeName('Updated');
    broker.changeCode('UPD');
    broker.deactivate();

    await repo.update(broker);
    const found = await repo.findById(broker.id);
    expect(found?.name).toBe('Updated');
    expect(found?.code).toBe('UPD');
    expect(found?.isActive()).toBe(false);
  });
});
