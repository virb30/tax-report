import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Knex } from 'knex';
import { OperationType, SourceType } from '../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../database';
import { OperationRepository } from './operation-repository';

describe('OperationRepository', () => {
  let database: Knex;
  let repository: OperationRepository;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);
    repository = new OperationRepository(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('creates buy operation and finds by id', async () => {
    const created = await repository.create({
      tradeDate: '2025-01-10',
      operationType: OperationType.Buy,
      ticker: 'PETR4',
      quantity: 100,
      unitPrice: 31.2,
      operationalCosts: 2.15,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Pdf,
    });

    const found = await repository.findById(created.id);

    expect(found).not.toBeNull();
    expect(found?.operationType).toBe(OperationType.Buy);
    expect(found?.sourceType).toBe(SourceType.Pdf);
    expect(found?.externalRef).toBeNull();
    expect(found?.importBatchId).toBeNull();
  });

  it('returns null when operation does not exist by id', async () => {
    const found = await repository.findById(12345);

    expect(found).toBeNull();
  });

  it('creates sell operation', async () => {
    const created = await repository.create({
      tradeDate: '2025-02-03',
      operationType: OperationType.Sell,
      ticker: 'VALE3',
      quantity: 50,
      unitPrice: 60.4,
      operationalCosts: 1.2,
      irrfWithheld: 0.02,
      broker: 'NU',
      sourceType: SourceType.Csv,
    });

    expect(created.operationType).toBe(OperationType.Sell);
    expect(created.irrfWithheld).toBe(0.02);
  });

  it('finds operations by date range', async () => {
    await repository.create({
      tradeDate: '2025-01-05',
      operationType: OperationType.Buy,
      ticker: 'ITSA4',
      quantity: 10,
      unitPrice: 10,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Manual,
    });
    await repository.create({
      tradeDate: '2025-02-05',
      operationType: OperationType.Buy,
      ticker: 'ITSA4',
      quantity: 10,
      unitPrice: 11,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Manual,
    });
    await repository.create({
      tradeDate: '2025-03-05',
      operationType: OperationType.Buy,
      ticker: 'ITSA4',
      quantity: 10,
      unitPrice: 12,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Manual,
    });

    const operations = await repository.findByDateRange('2025-02-01', '2025-03-31');

    expect(operations).toHaveLength(2);
    expect(operations[0]?.tradeDate).toBe('2025-02-05');
    expect(operations[1]?.tradeDate).toBe('2025-03-05');
  });

  it('finds operations by period contract', async () => {
    await repository.create({
      tradeDate: '2025-05-01',
      operationType: OperationType.Buy,
      ticker: 'PETR4',
      quantity: 2,
      unitPrice: 20,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Pdf,
    });

    const operations = await repository.findByPeriod({
      startDate: '2025-05-01',
      endDate: '2025-05-31',
    });

    expect(operations).toHaveLength(1);
    expect(operations[0]?.ticker).toBe('PETR4');
  });

  it('finds operations by ticker', async () => {
    await repository.create({
      tradeDate: '2025-04-01',
      operationType: OperationType.Buy,
      ticker: 'B3SA3',
      quantity: 3,
      unitPrice: 12,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Pdf,
    });
    await repository.create({
      tradeDate: '2025-04-02',
      operationType: OperationType.Sell,
      ticker: 'B3SA3',
      quantity: 1,
      unitPrice: 13,
      operationalCosts: 0.1,
      irrfWithheld: 0.01,
      broker: 'XP',
      sourceType: SourceType.Pdf,
    });
    await repository.create({
      tradeDate: '2025-04-03',
      operationType: OperationType.Buy,
      ticker: 'EGIE3',
      quantity: 4,
      unitPrice: 40,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Pdf,
    });

    const operations = await repository.findByTicker('B3SA3');

    expect(operations).toHaveLength(2);
    expect(operations.every((operation) => operation.ticker === 'B3SA3')).toBe(true);
  });

  it('updates existing operation', async () => {
    const created = await repository.create({
      tradeDate: '2025-06-10',
      operationType: OperationType.Buy,
      ticker: 'CMIG4',
      quantity: 7,
      unitPrice: 11.3,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Csv,
    });

    const updated = await repository.update(created.id, {
      operationType: OperationType.Sell,
      quantity: 3,
      operationalCosts: 1,
      irrfWithheld: 0.01,
      sourceType: SourceType.Pdf,
    });

    expect(updated).not.toBeNull();
    expect(updated?.operationType).toBe(OperationType.Sell);
    expect(updated?.quantity).toBe(3);
    expect(updated?.sourceType).toBe(SourceType.Pdf);
  });

  it('updates all mutable operation fields', async () => {
    const created = await repository.create({
      tradeDate: '2025-06-20',
      operationType: OperationType.Buy,
      ticker: 'SUZB3',
      quantity: 10,
      unitPrice: 55,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Pdf,
    });

    const updated = await repository.update(created.id, {
      tradeDate: '2025-06-21',
      operationType: OperationType.Sell,
      quantity: 8,
      unitPrice: 56,
      operationalCosts: 1.1,
      irrfWithheld: 0.02,
      broker: 'NU',
      sourceType: SourceType.Csv,
    });

    expect(updated?.tradeDate).toBe('2025-06-21');
    expect(updated?.unitPrice).toBe(56);
    expect(updated?.broker).toBe('NU');
  });

  it('updates operation without quantity payload', async () => {
    const created = await repository.create({
      tradeDate: '2025-10-01',
      operationType: OperationType.Buy,
      ticker: 'RDOR3',
      quantity: 6,
      unitPrice: 30,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Pdf,
    });

    const updated = await repository.update(created.id, {
      broker: 'INTER',
    });

    expect(updated?.broker).toBe('INTER');
    expect(updated?.quantity).toBe(6);
  });

  it('returns null when updating non-existing operation', async () => {
    const updated = await repository.update(8888, { quantity: 9 });

    expect(updated).toBeNull();
  });

  it('lists all operations', async () => {
    await repository.create({
      tradeDate: '2025-07-01',
      operationType: OperationType.Buy,
      ticker: 'CPLE6',
      quantity: 2,
      unitPrice: 8,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Manual,
    });
    await repository.create({
      tradeDate: '2025-07-02',
      operationType: OperationType.Buy,
      ticker: 'TAEE11',
      quantity: 2,
      unitPrice: 35,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Manual,
    });

    const allOperations = await repository.findAll();

    expect(allOperations).toHaveLength(2);
  });

  it('saves many operations at once', async () => {
    await repository.saveMany([
      {
        tradeDate: '2025-11-01',
        operationType: OperationType.Buy,
        ticker: 'PETR4',
        quantity: 10,
        unitPrice: 20,
        operationalCosts: 1,
        irrfWithheld: 0,
        broker: 'XP',
        sourceType: SourceType.Pdf,
      },
      {
        tradeDate: '2025-11-02',
        operationType: OperationType.Sell,
        ticker: 'PETR4',
        quantity: 2,
        unitPrice: 25,
        operationalCosts: 0.5,
        irrfWithheld: 0.1,
        broker: 'XP',
        sourceType: SourceType.Csv,
      },
    ]);

    const operations = await repository.findByTicker('PETR4');

    expect(operations).toHaveLength(2);
    expect(operations[0]?.operationType).toBe(OperationType.Buy);
    expect(operations[1]?.operationType).toBe(OperationType.Sell);
  });

  it('creates operation with idempotency metadata', async () => {
    const operation = await repository.create({
      tradeDate: '2025-11-11',
      operationType: OperationType.Buy,
      ticker: 'ABEV3',
      quantity: 9,
      unitPrice: 14,
      operationalCosts: 0.5,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Csv,
      externalRef: 'ext-001',
      importBatchId: 'batch-001',
    });

    expect(operation.externalRef).toBe('ext-001');
    expect(operation.importBatchId).toBe('batch-001');
  });

  it('finds operation by external reference', async () => {
    await repository.create({
      tradeDate: '2025-11-12',
      operationType: OperationType.Buy,
      ticker: 'ABEV3',
      quantity: 1,
      unitPrice: 13,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Csv,
      externalRef: 'ext-find',
      importBatchId: 'batch-find',
    });

    const operation = await repository.findByExternalRef('ext-find');

    expect(operation?.ticker).toBe('ABEV3');
  });

  it('returns null when external reference does not exist', async () => {
    const operation = await repository.findByExternalRef('ext-missing');

    expect(operation).toBeNull();
  });

  it('returns false when createIfNotExists receives duplicated external ref', async () => {
    const first = await repository.createIfNotExists({
      tradeDate: '2025-11-13',
      operationType: OperationType.Buy,
      ticker: 'ITUB4',
      quantity: 1,
      unitPrice: 20,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Csv,
      externalRef: 'ext-dup',
      importBatchId: 'batch-a',
    });
    const second = await repository.createIfNotExists({
      tradeDate: '2025-11-13',
      operationType: OperationType.Buy,
      ticker: 'ITUB4',
      quantity: 1,
      unitPrice: 20,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Csv,
      externalRef: 'ext-dup',
      importBatchId: 'batch-b',
    });

    const operations = await repository.findByTicker('ITUB4');
    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(operations).toHaveLength(1);
  });

  it('handles concurrent createIfNotExists calls with same external ref', async () => {
    const payload = {
      tradeDate: '2025-11-14',
      operationType: OperationType.Buy,
      ticker: 'ABEV3',
      quantity: 1,
      unitPrice: 12,
      operationalCosts: 0,
      irrfWithheld: 0,
      broker: 'XP',
      sourceType: SourceType.Csv,
      externalRef: 'ext-concurrent',
      importBatchId: 'batch-concurrent',
    };

    const [first, second] = await Promise.all([
      repository.createIfNotExists(payload),
      repository.createIfNotExists(payload),
    ]);

    const operations = await repository.findByTicker('ABEV3');
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(operations).toHaveLength(1);
  });

  it('rethrows non-unique errors from createIfNotExists', async () => {
    const createSpy = jest.spyOn(repository, 'create').mockRejectedValueOnce(new Error('db-down'));

    await expect(
      repository.createIfNotExists({
        tradeDate: '2025-11-15',
        operationType: OperationType.Buy,
        ticker: 'WEGE3',
        quantity: 1,
        unitPrice: 10,
        operationalCosts: 0,
        irrfWithheld: 0,
        broker: 'XP',
        sourceType: SourceType.Csv,
        externalRef: 'ext-error',
      }),
    ).rejects.toThrow('db-down');

    createSpy.mockRestore();
  });

  it('rethrows non-object errors from createIfNotExists', async () => {
    const createSpy = jest.spyOn(repository, 'create').mockRejectedValueOnce('db-down');

    await expect(
      repository.createIfNotExists({
        tradeDate: '2025-11-16',
        operationType: OperationType.Buy,
        ticker: 'WEGE3',
        quantity: 1,
        unitPrice: 10,
        operationalCosts: 0,
        irrfWithheld: 0,
        broker: 'XP',
        sourceType: SourceType.Csv,
        externalRef: 'ext-error-string',
      }),
    ).rejects.toBe('db-down');

    createSpy.mockRestore();
  });

  it('ignores empty saveMany payload', async () => {
    await repository.saveMany([]);

    const operations = await repository.findAll();

    expect(operations).toHaveLength(0);
  });

  it('deletes operation', async () => {
    const created = await repository.create({
      tradeDate: '2025-08-11',
      operationType: OperationType.Sell,
      ticker: 'WEGE3',
      quantity: 5,
      unitPrice: 49.5,
      operationalCosts: 0.2,
      irrfWithheld: 0.02,
      broker: 'XP',
      sourceType: SourceType.Csv,
    });

    const deleted = await repository.delete(created.id);
    const found = await repository.findById(created.id);

    expect(deleted).toBe(true);
    expect(found).toBeNull();
  });

  it('returns false when deleting unknown operation', async () => {
    const deleted = await repository.delete(9900);

    expect(deleted).toBe(false);
  });

  it('throws if created operation cannot be loaded', async () => {
    const findByIdSpy = jest.spyOn(repository, 'findById').mockResolvedValueOnce(null);

    await expect(
      repository.create({
        tradeDate: '2025-09-15',
        operationType: OperationType.Buy,
        ticker: 'VIVT3',
        quantity: 1,
        unitPrice: 40,
        operationalCosts: 0,
        irrfWithheld: 0,
        broker: 'XP',
        sourceType: SourceType.Manual,
      }),
    ).rejects.toThrow('Created operation was not found.');

    findByIdSpy.mockRestore();
  });
});
