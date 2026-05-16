import request from 'supertest';
import { createBackendApp } from '../app';
import { createMockBackendDependencies, createRuntimeConfig } from '../test/http-test-utils';

async function createTestBackend() {
  const dependencies = createMockBackendDependencies();
  const backend = await createBackendApp({
    config: createRuntimeConfig(),
    dependencies: dependencies.dependencies,
  });

  return {
    app: backend.app,
    useCases: dependencies.useCases,
  };
}

describe('core workflow HTTP routes', () => {
  it('calls broker use cases and returns expected JSON', async () => {
    const { app, useCases } = await createTestBackend();
    useCases.portfolio.listBrokersUseCase.execute.mockResolvedValue({ items: [] });
    useCases.portfolio.createBrokerUseCase.execute.mockResolvedValue({ id: 'broker-id' });
    useCases.portfolio.updateBrokerUseCase.execute.mockResolvedValue({ id: 'broker-id' });
    useCases.portfolio.toggleActiveBrokerUseCase.execute.mockResolvedValue({ active: false });

    await expect(request(app).get('/api/brokers?activeOnly=true')).resolves.toMatchObject({
      status: 200,
      body: { items: [] },
    });
    await expect(
      request(app).post('/api/brokers').send({
        name: 'XP',
        cnpj: '12345678000190',
        code: 'XP',
      }),
    ).resolves.toMatchObject({ status: 201, body: { id: 'broker-id' } });
    await expect(
      request(app).patch('/api/brokers/broker-id').send({ name: 'Clear' }),
    ).resolves.toMatchObject({
      status: 200,
      body: { id: 'broker-id' },
    });
    await expect(request(app).post('/api/brokers/broker-id/toggle-active')).resolves.toMatchObject({
      status: 200,
      body: { active: false },
    });

    expect(useCases.portfolio.listBrokersUseCase.execute).toHaveBeenCalledWith({
      activeOnly: true,
    });
    expect(useCases.portfolio.updateBrokerUseCase.execute).toHaveBeenCalledWith({
      id: 'broker-id',
      name: 'Clear',
    });
  });

  it('calls asset use cases and rejects invalid update payloads', async () => {
    const { app, useCases } = await createTestBackend();
    useCases.portfolio.listAssetsUseCase.execute.mockResolvedValue({ items: [] });
    useCases.portfolio.updateAssetUseCase.execute.mockResolvedValue({ ticker: 'ABCD3' });
    useCases.portfolio.repairAssetTypeUseCase.execute.mockResolvedValue({ ticker: 'ABCD3' });

    await expect(request(app).get('/api/assets?pendingOnly=true')).resolves.toMatchObject({
      status: 200,
      body: { items: [] },
    });
    await expect(request(app).patch('/api/assets/ABCD3').send({})).resolves.toMatchObject({
      status: 400,
      body: { error: { code: 'VALIDATION_ERROR' } },
    });
    await expect(
      request(app).patch('/api/assets/ABCD3').send({ assetType: 'stock' }),
    ).resolves.toMatchObject({
      status: 200,
      body: { ticker: 'ABCD3' },
    });
    await expect(
      request(app).post('/api/assets/ABCD3/repair-type').send({ assetType: 'fii' }),
    ).resolves.toMatchObject({
      status: 200,
      body: { ticker: 'ABCD3' },
    });

    expect(useCases.portfolio.updateAssetUseCase.execute).toHaveBeenCalledWith({
      ticker: 'ABCD3',
      assetType: 'stock',
    });
  });

  it('calls initial balance and position use cases', async () => {
    const { app, useCases } = await createTestBackend();
    useCases.portfolio.listInitialBalanceDocumentsUseCase.execute.mockResolvedValue({ items: [] });
    useCases.portfolio.saveInitialBalanceDocumentUseCase.execute.mockResolvedValue({
      ticker: 'ABCD3',
    });
    useCases.portfolio.deleteInitialBalanceDocumentUseCase.execute.mockResolvedValue({
      deleted: true,
    });
    useCases.portfolio.listPositionsUseCase.execute.mockResolvedValue({ items: [] });
    useCases.portfolio.deletePositionUseCase.execute.mockResolvedValue({ deleted: true });
    useCases.portfolio.deleteAllPositionsUseCase.execute.mockResolvedValue({ deletedCount: 1 });
    useCases.portfolio.recalculatePositionUseCase.execute.mockResolvedValue({
      totalQuantity: '1',
      averagePrice: '10',
    });
    useCases.portfolio.migrateYearUseCase.execute.mockResolvedValue({
      migratedPositionsCount: 1,
      createdTransactionsCount: 1,
    });

    await expect(request(app).get('/api/initial-balances?year=2025')).resolves.toMatchObject({
      status: 200,
      body: { items: [] },
    });
    await expect(
      request(app)
        .post('/api/initial-balances')
        .send({
          ticker: 'ABCD3',
          year: 2025,
          assetType: 'stock',
          averagePrice: '10',
          allocations: [{ brokerId: 'broker-id', quantity: '1' }],
        }),
    ).resolves.toMatchObject({ status: 200, body: { ticker: 'ABCD3' } });
    await expect(request(app).delete('/api/initial-balances/2025/ABCD3')).resolves.toMatchObject({
      status: 200,
      body: { deleted: true },
    });
    await expect(request(app).get('/api/positions?year=2025')).resolves.toMatchObject({
      status: 200,
      body: { items: [] },
    });
    await expect(
      request(app).delete('/api/positions/ABCD3?year=2025'),
    ).resolves.toMatchObject({
      status: 200,
      body: { deleted: true },
    });
    await expect(request(app).delete('/api/positions?year=2025')).resolves.toMatchObject({
      status: 200,
      body: { deletedCount: 1 },
    });
    await expect(
      request(app).post('/api/positions/recalculate').send({
        ticker: 'ABCD3',
        year: 2025,
        averagePriceFeeMode: 'ignore',
      }),
    ).resolves.toMatchObject({ status: 200, body: { totalQuantity: '1' } });
    await expect(
      request(app).post('/api/positions/migrate-year').send({
        sourceYear: 2024,
        targetYear: 2025,
      }),
    ).resolves.toMatchObject({ status: 200, body: { migratedPositionsCount: 1 } });
  });

  it('calls monthly tax and report use cases', async () => {
    const { app, useCases } = await createTestBackend();
    useCases.taxReporting.listMonthlyTaxHistoryUseCase.execute.mockResolvedValue({ months: [] });
    useCases.taxReporting.getMonthlyTaxDetailUseCase.execute.mockResolvedValue({
      detail: { month: '2025-01' },
    });
    useCases.taxReporting.recalculateMonthlyTaxHistoryUseCase.execute.mockResolvedValue({
      rebuiltMonths: ['2025-01'],
    });
    useCases.taxReporting.generateAssetsReportUseCase.execute.mockResolvedValue({
      referenceDate: '2025-12-31',
      items: [],
    });

    await expect(
      request(app).get('/api/monthly-tax/history?startYear=2025'),
    ).resolves.toMatchObject({
      status: 200,
      body: { months: [] },
    });
    await expect(request(app).get('/api/monthly-tax/months/2025-01')).resolves.toMatchObject({
      status: 200,
      body: { detail: { month: '2025-01' } },
    });
    await expect(
      request(app).post('/api/monthly-tax/recalculate').send({ startYear: 2025 }),
    ).resolves.toMatchObject({
      status: 200,
      body: { rebuiltMonths: ['2025-01'] },
    });
    await expect(request(app).get('/api/reports/assets?baseYear=2025')).resolves.toMatchObject({
      status: 200,
      body: { referenceDate: '2025-12-31' },
    });
  });

  it('parses multipart imports and calls ingestion use cases', async () => {
    const { app, useCases } = await createTestBackend();
    useCases.ingestion.previewImportUseCase.execute.mockResolvedValue({ summary: {} });
    useCases.ingestion.importTransactionsUseCase.execute.mockResolvedValue({ importedCount: 1 });
    useCases.ingestion.importDailyBrokerTaxesUseCase.execute.mockResolvedValue({
      importedCount: 1,
    });
    useCases.ingestion.importConsolidatedPositionUseCase.preview.mockResolvedValue({ rows: [] });
    useCases.ingestion.importConsolidatedPositionUseCase.execute.mockResolvedValue({
      importedCount: 1,
    });

    await expect(
      request(app)
        .post('/api/transactions/import:preview')
        .attach('file', Buffer.from('date,ticker\n2025-01-01,ABCD3'), 'transactions.csv'),
    ).resolves.toMatchObject({ status: 200, body: { summary: {} } });
    await expect(
      request(app)
        .post('/api/transactions/import:confirm')
        .field('assetTypeOverrides', JSON.stringify([{ ticker: 'ABCD3', assetType: 'stock' }]))
        .attach('file', Buffer.from('date,ticker\n2025-01-01,ABCD3'), 'transactions.csv'),
    ).resolves.toMatchObject({ status: 200, body: { importedCount: 1 } });
    await expect(
      request(app)
        .post('/api/daily-broker-taxes/import')
        .attach('file', Buffer.from('date,fees\n2025-01-01,1'), 'taxes.csv'),
    ).resolves.toMatchObject({ status: 200, body: { importedCount: 1 } });
    await expect(
      request(app)
        .post('/api/positions/consolidated-preview')
        .attach('file', Buffer.from('ticker,quantity\nABCD3,1'), 'positions.csv'),
    ).resolves.toMatchObject({ status: 200, body: { rows: [] } });
    await expect(
      request(app)
        .post('/api/positions/consolidated-import')
        .field('year', '2025')
        .field('assetTypeOverrides', JSON.stringify([{ ticker: 'ABCD3', assetType: 'stock' }]))
        .attach('file', Buffer.from('ticker,quantity\nABCD3,1'), 'positions.csv'),
    ).resolves.toMatchObject({ status: 200, body: { importedCount: 1 } });

    expect(useCases.ingestion.importTransactionsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        assetTypeOverrides: [{ ticker: 'ABCD3', assetType: 'stock' }],
      }),
    );
    expect(useCases.ingestion.importConsolidatedPositionUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2025,
      }),
    );
  });

  it('returns validation errors for invalid multipart fields without confirming imports', async () => {
    const { app, useCases } = await createTestBackend();

    await expect(
      request(app)
        .post('/api/transactions/import:confirm')
        .field('assetTypeOverrides', '{invalid json')
        .attach('file', Buffer.from('date,ticker\n2025-01-01,ABCD3'), 'transactions.csv'),
    ).resolves.toMatchObject({
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
        },
      },
    });

    expect(useCases.ingestion.importTransactionsUseCase.execute).not.toHaveBeenCalled();
  });

  it('calls daily broker tax use cases and maps known errors consistently', async () => {
    const { app, useCases } = await createTestBackend();
    useCases.ingestion.listDailyBrokerTaxesUseCase.execute.mockResolvedValue({ items: [] });
    useCases.ingestion.saveDailyBrokerTaxUseCase.execute.mockResolvedValue({
      tax: { date: '2025-01-01' },
      recalculatedTickers: [],
    });
    useCases.ingestion.deleteDailyBrokerTaxUseCase.execute.mockResolvedValue({
      deleted: true,
      recalculatedTickers: [],
    });
    useCases.portfolio.listBrokersUseCase.execute.mockRejectedValue(
      new Error('Corretora nao encontrada.'),
    );

    await expect(request(app).get('/api/daily-broker-taxes')).resolves.toMatchObject({
      status: 200,
      body: { items: [] },
    });
    await expect(
      request(app).post('/api/daily-broker-taxes').send({
        date: '2025-01-01',
        brokerId: 'broker-id',
        fees: 1,
        irrf: 0,
      }),
    ).resolves.toMatchObject({ status: 200, body: { tax: { date: '2025-01-01' } } });
    await expect(
      request(app).delete('/api/daily-broker-taxes/2025-01-01/broker-id'),
    ).resolves.toMatchObject({
      status: 200,
      body: { deleted: true },
    });
    await expect(request(app).get('/api/brokers')).resolves.toMatchObject({
      status: 404,
      body: {
        error: {
          code: 'NOT_FOUND',
          message: 'Corretora nao encontrada.',
        },
      },
    });
  });
});
