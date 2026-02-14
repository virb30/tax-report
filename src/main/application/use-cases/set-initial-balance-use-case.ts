import type {
  SetInitialBalanceCommand,
  SetInitialBalanceResult,
} from '@shared/contracts/initial-balance.contract';
import { AssetPosition } from '../../domain/portfolio/asset-position.entity';
import type { PositionRepository } from '../repositories/position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { TransactionType } from '../../../shared/types/domain';
import { SourceType } from '../../../shared/types/domain';
import { randomUUID } from 'node:crypto';

export class SetInitialBalanceUseCase {
  constructor(
    private readonly positionRepository: PositionRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: SetInitialBalanceCommand): Promise<SetInitialBalanceResult> {
    this.validate(input);

    const existingSnapshot = await this.positionRepository.findByTicker(input.ticker);

    const position = existingSnapshot
      ? AssetPosition.create(existingSnapshot)
      : AssetPosition.create({
          ticker: input.ticker,
          assetType: input.assetType,
          totalQuantity: 0,
          averagePrice: 0,
          brokerBreakdown: [],
        });

    position.applyInitialBalance({
      quantity: input.quantity,
      averagePrice: input.averagePrice,
      brokerId: input.brokerId,
    });

    const transactionDate = `${input.year}-01-01`;
    const transaction = {
      id: randomUUID(),
      date: transactionDate,
      type: TransactionType.InitialBalance,
      ticker: input.ticker,
      quantity: input.quantity,
      unitPrice: input.averagePrice,
      fees: 0,
      brokerId: input.brokerId,
      sourceType: SourceType.Manual,
    };

    await this.transactionRepository.save(transaction);
    await this.positionRepository.save(position.toSnapshot());

    return {
      ticker: input.ticker,
      brokerId: input.brokerId,
      quantity: input.quantity,
      averagePrice: input.averagePrice,
    };
  }

  private validate(input: SetInitialBalanceCommand): void {
    if (!input.ticker || input.ticker.trim().length === 0) {
      throw new Error('Ticker é obrigatório.');
    }
    if (typeof input.year !== 'number' || !Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) {
      throw new Error('Ano inválido.');
    }
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
