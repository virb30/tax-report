import type { Queue } from '../../../../shared/infra/events/queue.interface';
import { ConsolidatedPositionImportedEvent } from '../../../../shared/domain/events/consolidated-position-imported.event';
import { TransactionFeesReallocatedEvent } from '../../../../shared/domain/events/transaction-fees-reallocated.event';
import { TransactionsImportedEvent } from '../../../../shared/domain/events/transactions-imported.event';
import type { RecalculatePositionUseCase } from '../../../application/use-cases/recalculate-position.use-case';

export class RecalculatePositionHandler {
  constructor(
    private readonly queue: Queue,
    private readonly recalculatePositionUseCase: RecalculatePositionUseCase,
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
  }

  private readonly handleConsolidatedPositionImported = async (
    event: ConsolidatedPositionImportedEvent,
  ): Promise<void> => {
    await this.recalculatePositionUseCase.execute({
      ticker: event.ticker,
      year: event.year,
    });
  };

  private readonly handleTransactionsImported = async (
    event: TransactionsImportedEvent,
  ): Promise<void> => {
    await this.recalculatePositionUseCase.execute({
      ticker: event.ticker,
      year: event.year,
    });
  };

  private readonly handleTransactionFeesReallocated = async (
    event: TransactionFeesReallocatedEvent,
  ): Promise<void> => {
    await this.recalculatePositionUseCase.execute({
      ticker: event.ticker,
      year: event.year,
    });
  };
}
