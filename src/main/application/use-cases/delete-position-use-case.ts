import type {
  DeletePositionCommand,
  DeletePositionResult,
} from '@shared/contracts/delete-position.contract';
import type { PositionRepository } from '../repositories/position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';

export class DeletePositionUseCase {
  constructor(
    private readonly positionRepository: PositionRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: DeletePositionCommand): Promise<DeletePositionResult> {
    this.validate(input);

    const existing = await this.positionRepository.findByTickerAndYear(
      input.ticker,
      input.year,
    );

    if (!existing) {
      return { deleted: false };
    }

    await this.transactionRepository.deleteInitialBalanceByTickerAndYear(
      input.ticker,
      input.year,
    );
    await this.positionRepository.delete(input.ticker, input.year);

    return { deleted: true };
  }

  private validate(input: DeletePositionCommand): void {
    if (typeof input.ticker !== 'string' || input.ticker.trim().length === 0) {
      throw new Error('Ticker inválido.');
    }
    if (typeof input.year !== 'number' || !Number.isInteger(input.year)) {
      throw new Error('Ano inválido.');
    }
    if (input.year < 2000 || input.year > 2100) {
      throw new Error('Ano deve estar entre 2000 e 2100.');
    }
  }
}
