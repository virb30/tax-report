import { AssetPosition } from '../../../domain/entities/asset-position.entity';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { TransactionType } from '../../../../../shared/types/domain';
import { SourceType } from '../../../../../shared/types/domain';
import { Uuid } from '../../../../shared/domain/value-objects/uuid.vo';
import type { SetInitialBalanceOutput } from './set-initial-balance.output';
import type { SetInitialBalanceInput } from './set-initial-balance.input';
import { Transaction } from '../../../domain/entities/transaction.entity';
import { assertSupportedYear } from '../../../../../shared/utils/year';

export class SetInitialBalanceUseCase {
  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: SetInitialBalanceInput): Promise<SetInitialBalanceOutput> {
    this.validate(input);

    let position = await this.positionRepository.findByTickerAndYear(input.ticker, input.year);

    if (!position) {
      position = AssetPosition.create({
        ticker: input.ticker,
        assetType: input.assetType,
        year: input.year,
      });
    }

    position.applyInitialBalance({
      quantity: input.quantity,
      averagePrice: input.averagePrice,
      brokerId: Uuid.from(input.brokerId),
    });

    const transactionDate = `${input.year}-01-01`;
    const transaction = Transaction.create({
      date: transactionDate,
      type: TransactionType.InitialBalance,
      ticker: input.ticker,
      quantity: input.quantity,
      unitPrice: input.averagePrice,
      fees: 0,
      brokerId: Uuid.from(input.brokerId),
      sourceType: SourceType.Manual,
    });

    await this.transactionRepository.save(transaction);
    await this.positionRepository.save(position);

    return {
      ticker: input.ticker,
      brokerId: input.brokerId,
      quantity: position.totalQuantity,
      averagePrice: position.averagePrice,
    };
  }

  private validate(input: SetInitialBalanceInput): void {
    if (!input.ticker || input.ticker.trim().length === 0) {
      throw new Error('Ticker é obrigatório.');
    }
    assertSupportedYear(input.year, { invalidTypeMessage: 'Ano inválido.' });
    if (!input.brokerId || input.brokerId.trim().length === 0) {
      throw new Error('Corretora é obrigatória.');
    }
    if (typeof input.quantity !== 'number' || input.quantity <= 0) {
      throw new Error('Quantidade deve ser maior que zero.');
    }
    if (typeof input.averagePrice !== 'number' || input.averagePrice <= 0) {
      throw new Error('Preço médio deve ser maior que zero.');
    }
  }
}
