import type { Knex } from 'knex';
import { createIngestionModule } from '../../../ingestion/infra/container';
import { createPortfolioModule } from '../../../portfolio/infra/container';
import { createTaxReportingModule } from '../../../tax-reporting/infra/container';
import { TransactionFeeAllocator } from '../../../portfolio/domain/services/transaction-fee-allocator.service';
import { MemoryQueueAdapter } from '../../../shared/infra/events/memory-queue.adapter';
import { ConsolidatedPositionImportedEvent } from '../../../shared/domain/events/consolidated-position-imported.event';
import { TransactionFeesReallocatedEvent } from '../../../shared/domain/events/transaction-fees-reallocated.event';
import { TransactionsImportedEvent } from '../../../shared/domain/events/transactions-imported.event';
import { AssetTaxClassificationChangedEvent } from '../../../shared/domain/events/asset-tax-classification-changed.event';
import { createAppModule } from './app-module';
import { createSharedInfrastructure } from './shared-infrastructure';

describe('backend module composition', () => {
  it('creates an app module without desktop transport ownership', () => {
    const module = createAppModule();

    expect(module.startup).toBeUndefined();
    expect('registerIpc' in module).toBe(false);
  });

  it('creates shared infrastructure without registering a root container', () => {
    const database = jest.fn() as unknown as Knex;

    const shared = createSharedInfrastructure(database);

    expect(shared.database).toBe(database);
    expect(shared.queue).toBeInstanceOf(MemoryQueueAdapter);
    expect(shared.transactionFeeAllocator).toBeInstanceOf(TransactionFeeAllocator);
  });

  it('initializes shared, portfolio, ingestion, and tax-reporting modules from backend src', () => {
    const shared = createSharedInfrastructure(jest.fn() as unknown as Knex);
    const queue = shared.queue as MemoryQueueAdapter;
    const appModule = createAppModule();
    const portfolioModule = createPortfolioModule(shared);
    const ingestionModule = createIngestionModule({
      shared,
      portfolio: portfolioModule.exports,
    });
    const taxReportingModule = createTaxReportingModule({
      shared,
      portfolio: portfolioModule.exports,
      ingestion: ingestionModule.repositories,
    });
    const modules = [appModule, portfolioModule, ingestionModule, taxReportingModule];

    for (const module of modules) {
      module.startup?.initialize();
    }
    for (const module of modules) {
      module.startup?.initialize();
    }

    expect(portfolioModule.useCases.createBrokerUseCase).toBeDefined();
    expect(ingestionModule.useCases.importTransactionsUseCase).toBeDefined();
    expect(taxReportingModule.useCases.generateAssetsReportUseCase).toBeDefined();
    expect(queue.consumers.get(ConsolidatedPositionImportedEvent.name)).toHaveLength(2);
    expect(queue.consumers.get(TransactionsImportedEvent.name)).toHaveLength(2);
    expect(queue.consumers.get(TransactionFeesReallocatedEvent.name)).toHaveLength(2);
    expect(queue.consumers.get(AssetTaxClassificationChangedEvent.name)).toHaveLength(1);
  });
});
