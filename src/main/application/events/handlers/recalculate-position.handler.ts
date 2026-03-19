import type { Queue } from '../queue.interface';
import { ConsolidatedPositionImportedEvent } from '../../../domain/events/consolidated-position-imported.event';
import { TransactionsImportedEvent } from '../../../domain/events/transactions-imported.event';
import type { RecalculatePositionUseCase } from '../../use-cases/recalculate-position/recalculate-position.use-case';

export class RecalculatePositionHandler {
  constructor(
    private readonly queue: Queue,
    private readonly recalculatePositionUseCase: RecalculatePositionUseCase,
  ) {
    this.queue.subscribe(
      ConsolidatedPositionImportedEvent.name,
      this.handleConsolidatedPositionImported,
    );
    this.queue.subscribe(
      TransactionsImportedEvent.name,
      this.handleTransactionsImported,
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
}
