import { afterEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { createDatabaseConnection } from '../../database/database-connection';
import { initializeDatabase } from '../../database/database';
import { KnexBrokerRepository } from './knex-broker.repository';

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
    return database;
  }

  it('saves and finds broker by id', async () => {
    await setupDatabase();
    const repo = new KnexBrokerRepository(database);

    await repo.save({
      id: 'broker-test-1',
      name: 'Test Broker',
      cnpj: '11.222.333/0001-44',
      code: 'TEST',
      active: true,
    });

    const found = await repo.findById('broker-test-1');
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Test Broker');
    expect(found?.cnpj).toBe('11.222.333/0001-44');
  });

  it('returns null when broker does not exist', async () => {
    await setupDatabase();
    const repo = new KnexBrokerRepository(database);

    const found = await repo.findById('non-existent');
    expect(found).toBeNull();
  });

  it('finds broker by name', async () => {
    await setupDatabase();
    const repo = new KnexBrokerRepository(database);

    await repo.save({
      id: 'b1',
      name: 'Unique Name',
      cnpj: '11.111.111/0001-11',
      code: 'UNIQ',
      active: true,
    });

    const found = await repo.findByName('Unique Name');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('b1');
  });

  it('returns all brokers ordered by name', async () => {
    await setupDatabase();
    const repo = new KnexBrokerRepository(database);

    await repo.save({
      id: 'b-z',
      name: 'Zebra',
      cnpj: '99.999.999/0001-99',
      code: 'ZEBRA',
      active: true,
    });
    await repo.save({
      id: 'b-a',
      name: 'Alpha',
      cnpj: '11.111.111/0001-11',
      code: 'ALPHA',
      active: true,
    });
    await repo.save({
      id: 'b-m',
      name: 'Middle',
      cnpj: '55.555.555/0001-55',
      code: 'MID',
      active: true,
    });

    const all = await repo.findAll();
    expect(all).toHaveLength(3);
    expect(all[0]?.name).toBe('Alpha');
    expect(all[1]?.name).toBe('Middle');
    expect(all[2]?.name).toBe('Zebra');
  });

  it('findAllActive returns only active brokers', async () => {
    await setupDatabase();
    const repo = new KnexBrokerRepository(database);

    await repo.save({
      id: 'b1',
      name: 'Active Broker',
      cnpj: '11.111.111/0001-11',
      code: 'ACTIVE',
      active: true,
    });
    await repo.save({
      id: 'b2',
      name: 'Inactive Broker',
      cnpj: '22.222.222/0001-22',
      code: 'INACTIVE',
      active: false,
    });

    const active = await repo.findAllActive();
    expect(active).toHaveLength(1);
    expect(active[0]?.code).toBe('ACTIVE');
  });

  it('update modifies broker fields', async () => {
    await setupDatabase();
    const repo = new KnexBrokerRepository(database);

    await repo.save({
      id: 'b1',
      name: 'Original',
      cnpj: '11.111.111/0001-11',
      code: 'ORIG',
      active: true,
    });

    await repo.update('b1', { name: 'Updated', code: 'UPD' });
    const found = await repo.findById('b1');
    expect(found?.name).toBe('Updated');
    expect(found?.code).toBe('UPD');
    expect(found?.active).toBe(true);
  });
});
