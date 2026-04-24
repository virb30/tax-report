import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import type { DeletePositionInput } from './delete-position.input';
import type { DeletePositionOutput } from './delete-position.output';
import { assertSupportedYear } from '../../../../shared/utils/year';

export class DeletePositionUseCase {
  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: DeletePositionInput): Promise<DeletePositionOutput> {
    this.validate(input);

    const position = await this.positionRepository.findByTickerAndYear(input.ticker, input.year);

    if (!position) {
      return { deleted: false };
    }

    await this.transactionRepository.deleteByTickerAndYear(input.ticker, input.year);
    await this.positionRepository.delete(input.ticker, input.year);

    return { deleted: true };
  }

  private validate(input: DeletePositionInput): void {
    if (typeof input.ticker !== 'string' || input.ticker.trim().length === 0) {
      throw new Error('Ticker inválido.');
    }
    assertSupportedYear(input.year, {
      invalidTypeMessage: 'Ano inválido.',
      outOfRangeMessage: 'Ano deve estar entre 2000 e 2100.',
    });
  }
}
