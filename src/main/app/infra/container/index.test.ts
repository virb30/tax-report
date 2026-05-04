import type { Knex } from 'knex';
import { registerDependencies, container } from './index';

describe('Awilix Container', () => {
  it('should register and resolve all dependencies correctly', () => {
    const dbMock = {} as Knex;

    registerDependencies(dbMock);

    expect(container.resolve('createBrokerUseCase')).toBeDefined();
    expect(container.resolve('updateBrokerUseCase')).toBeDefined();
    expect(container.resolve('listBrokersUseCase')).toBeDefined();
    expect(container.resolve('toggleActiveBrokerUseCase')).toBeDefined();
    expect(container.resolve('recalculatePositionUseCase')).toBeDefined();
    expect(container.resolve('importTransactionsUseCase')).toBeDefined();
    expect(container.resolve('previewImportUseCase')).toBeDefined();
    expect(container.resolve('dailyBrokerTaxRepository')).toBeDefined();
    expect(container.resolve('dailyBrokerTaxesParser')).toBeDefined();
    expect(container.resolve('transactionFeeRepository')).toBeDefined();
    expect(container.resolve('transactionFeeAllocator')).toBeDefined();
    expect(container.resolve('reallocateTransactionFeesService')).toBeDefined();
    expect(container.resolve('listDailyBrokerTaxesUseCase')).toBeDefined();
    expect(container.resolve('saveDailyBrokerTaxUseCase')).toBeDefined();
    expect(container.resolve('importDailyBrokerTaxesUseCase')).toBeDefined();
    expect(container.resolve('deleteDailyBrokerTaxUseCase')).toBeDefined();
    expect(container.resolve('initialBalanceDocumentPositionSyncService')).toBeDefined();
    expect(container.resolve('saveInitialBalanceDocumentUseCase')).toBeDefined();
    expect(container.resolve('listInitialBalanceDocumentsUseCase')).toBeDefined();
    expect(container.resolve('deleteInitialBalanceDocumentUseCase')).toBeDefined();
    expect(container.resolve('listPositionsUseCase')).toBeDefined();
    expect(container.resolve('migrateYearUseCase')).toBeDefined();
    expect(container.resolve('importConsolidatedPositionUseCase')).toBeDefined();
    expect(container.resolve('deletePositionUseCase')).toBeDefined();
    expect(container.resolve('generateAssetsReportUseCase')).toBeDefined();
    expect(container.resolve('repairAssetTypeUseCase')).toBeDefined();

    expect(container.resolve('recalculatePositionHandler')).toBeDefined();
    expect(container.resolve('brokersIpcRegistrar')).toBeDefined();
  });
});
