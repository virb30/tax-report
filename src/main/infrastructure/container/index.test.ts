import { registerDependencies, container } from './index';
import { Knex } from 'knex';

describe('Awilix Container', () => {
  it('should register and resolve all dependencies correctly', () => {
    // Mock simples do Knex apenas para não falhar na injeção
    const dbMock = {} as Knex;

    registerDependencies(dbMock);

    // Verifica se todos os Use Cases e Handlers podem ser resolvidos
    // Isso garante que não esquecemos de injetar alguma dependência no container
    
    expect(container.resolve('createBrokerUseCase')).toBeDefined();
    expect(container.resolve('updateBrokerUseCase')).toBeDefined();
    expect(container.resolve('listBrokersUseCase')).toBeDefined();
    expect(container.resolve('toggleActiveBrokerUseCase')).toBeDefined();
    expect(container.resolve('recalculatePositionUseCase')).toBeDefined();
    expect(container.resolve('importTransactionsUseCase')).toBeDefined();
    expect(container.resolve('previewImportUseCase')).toBeDefined();
    expect(container.resolve('setInitialBalanceUseCase')).toBeDefined();
    expect(container.resolve('listPositionsUseCase')).toBeDefined();
    expect(container.resolve('migrateYearUseCase')).toBeDefined();
    expect(container.resolve('importConsolidatedPositionUseCase')).toBeDefined();
    expect(container.resolve('deletePositionUseCase')).toBeDefined();
    expect(container.resolve('generateAssetsReportUseCase')).toBeDefined();
    
    expect(container.resolve('recalculatePositionHandler')).toBeDefined();
    expect(container.resolve('brokersController')).toBeDefined();
  });
});
