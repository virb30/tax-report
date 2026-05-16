import type { Queue } from '../../../../shared/infra/events/queue.interface';
import { AssetTaxClassificationChangedEvent } from '../../../../shared/domain/events/asset-tax-classification-changed.event';
import { ConsolidatedPositionImportedEvent } from '../../../../shared/domain/events/consolidated-position-imported.event';
import { TransactionFeesReallocatedEvent } from '../../../../shared/domain/events/transaction-fees-reallocated.event';
import { TransactionsImportedEvent } from '../../../../shared/domain/events/transactions-imported.event';
import type { RecalculateMonthlyTaxHistoryUseCase } from '../../../application/use-cases/recalculate-monthly-tax-history.use-case';

export class RecalculateMonthlyTaxCloseHandler {
  constructor(
    private readonly queue: Queue,
    private readonly recalculateMonthlyTaxHistoryUseCase: RecalculateMonthlyTaxHistoryUseCase,
  ) {
    this.queue.subscribe(
      ConsolidatedPositionImportedEvent.name,
      this.handleConsolidatedPositionImported,
    );
    this.queue.subscribe(TransactionsImportedEvent.name, this.handleTransactionsImported);
    this.queue.subscribe(
      TransactionFeesReallocatedEvent.name,
      this.handleTransactionFeesReallocated,
    );
    this.queue.subscribe(
      AssetTaxClassificationChangedEvent.name,
      this.handleAssetTaxClassificationChanged,
    );
  }

  private readonly handleConsolidatedPositionImported = async (
    event: ConsolidatedPositionImportedEvent,
  ): Promise<void> => {
    await this.recalculateMonthlyTaxHistoryUseCase.execute({
      startYear: event.year,
      reason: 'transactions_changed',
    });
  };

  private readonly handleTransactionsImported = async (
    event: TransactionsImportedEvent,
  ): Promise<void> => {
    await this.recalculateMonthlyTaxHistoryUseCase.execute({
      startYear: event.year,
      reason: 'transactions_changed',
    });
  };

  private readonly handleTransactionFeesReallocated = async (
    event: TransactionFeesReallocatedEvent,
  ): Promise<void> => {
    await this.recalculateMonthlyTaxHistoryUseCase.execute({
      startYear: event.year,
      reason: 'fees_changed',
    });
  };

  private readonly handleAssetTaxClassificationChanged = async (
    event: AssetTaxClassificationChangedEvent,
  ): Promise<void> => {
    await this.recalculateMonthlyTaxHistoryUseCase.execute({
      startYear: event.earliestYear,
      reason: 'asset_type_changed',
    });
  };
}
