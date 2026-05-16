import type { AssetPositionRepository } from '../repositories/asset-position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { assertSupportedYear } from '../../../shared/utils/year';

export interface DeleteAllPositionsInput {
  year: number;
}

export interface DeleteAllPositionsOutput {
  deletedCount: number;
}

export class DeleteAllPositionsUseCase {
  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: DeleteAllPositionsInput): Promise<DeleteAllPositionsOutput> {
    assertSupportedYear(input.year, {
      invalidTypeMessage: 'Ano inválido.',
      outOfRangeMessage: 'Ano deve estar entre 2000 e 2100.',
    });

    const positions = await this.positionRepository.findAllByYear(input.year);

    for (const position of positions) {
      await this.transactionRepository.deleteByTickerAndYear(position.ticker, input.year);
      await this.positionRepository.delete(position.ticker, input.year);
    }

    return { deletedCount: positions.length };
  }
}
