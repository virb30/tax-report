import { assertSupportedYear } from '../../../../shared/utils/year';
import type { TransactionRepository } from '../repositories/transaction.repository';
import type { InitialBalanceDocumentPositionSyncService } from '../services/initial-balance-document-position-sync.service';

export interface DeleteInitialBalanceDocumentInput {
  ticker: string;
  year: number;
}

export interface DeleteInitialBalanceDocumentOutput {
  deleted: boolean;
}

export class DeleteInitialBalanceDocumentUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly initialBalanceDocumentPositionSyncService: InitialBalanceDocumentPositionSyncService,
  ) {}

  async execute(
    input: DeleteInitialBalanceDocumentInput,
  ): Promise<DeleteInitialBalanceDocumentOutput> {
    this.validate(input);

    const existing = await this.transactionRepository.findInitialBalanceDocumentByTickerAndYear(
      input.ticker,
      input.year,
    );

    if (!existing) {
      return { deleted: false };
    }

    await this.transactionRepository.deleteInitialBalanceByTickerAndYear(input.ticker, input.year);
    await this.initialBalanceDocumentPositionSyncService.sync({
      ticker: input.ticker,
      year: input.year,
    });

    return { deleted: true };
  }

  private validate(input: DeleteInitialBalanceDocumentInput): void {
    if (typeof input.ticker !== 'string' || input.ticker.trim().length === 0) {
      throw new Error('Ticker inválido.');
    }
    assertSupportedYear(input.year, {
      invalidTypeMessage: 'Ano inválido.',
      outOfRangeMessage: 'Ano deve estar entre 2000 e 2100.',
    });
  }
}
