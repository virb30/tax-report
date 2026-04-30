import type { SaveInitialBalanceDocumentCommand } from '../../../../shared/contracts/initial-balance.contract';
import { SourceType, TransactionType } from '../../../../shared/types/domain';
import { assertSupportedYear } from '../../../../shared/utils/year';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import type { InitialBalanceDocumentPositionSyncService } from '../../services/initial-balance-document-position-sync.service';
import { Transaction } from '../../../domain/portfolio/entities/transaction.entity';
import { Uuid } from '../../../domain/shared/uuid.vo';
import { Quantity } from '../../../domain/portfolio/value-objects/quantity.vo';
import { Money } from '../../../domain/portfolio/value-objects/money.vo';
import type { SaveInitialBalanceDocumentOutput } from './save-initial-balance-document.output';

export class SaveInitialBalanceDocumentUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly initialBalanceDocumentPositionSyncService: InitialBalanceDocumentPositionSyncService,
  ) {}

  async execute(input: SaveInitialBalanceDocumentCommand): Promise<SaveInitialBalanceDocumentOutput> {
    this.validate(input);

    const averagePrice = Money.from(input.averagePrice);

    const transactions = input.allocations.map((allocation) => 
      Transaction.create({
        date: `${input.year}-01-01`,
        type: TransactionType.InitialBalance,
        ticker: input.ticker,
        quantity: Quantity.from(allocation.quantity),
        unitPrice: averagePrice,
        fees: Money.from(0),
        brokerId: Uuid.from(allocation.brokerId),
        sourceType: SourceType.Manual,
      }),
    );

    await this.transactionRepository.replaceInitialBalanceTransactionsForTickerAndYear(
      input.ticker,
      input.year,
      transactions,
    );
    const position = await this.initialBalanceDocumentPositionSyncService.sync({
      ticker: input.ticker,
      year: input.year,
      assetType: input.assetType,
    });

    return {
      ticker: input.ticker,
      year: input.year,
      assetType: input.assetType,
      averagePrice: averagePrice.getAmount(),
      allocations: input.allocations,
      totalQuantity: position.totalQuantity.getAmount(),
    };
  }

  private validate(input: SaveInitialBalanceDocumentCommand): void {
    if (typeof input.ticker !== 'string' || input.ticker.trim().length === 0) {
      throw new Error('Ticker é obrigatório.');
    }
    assertSupportedYear(input.year, {
      invalidTypeMessage: 'Ano inválido.',
      outOfRangeMessage: 'Ano deve estar entre 2000 e 2100.',
    });
    const averagePrice = Number(input.averagePrice);
    if (input.averagePrice.trim().length === 0 || Number.isNaN(averagePrice) || averagePrice <= 0) {
      throw new Error('Preço médio deve ser maior que zero.');
    }
    if (input.allocations.length === 0) {
      throw new Error('Documento deve conter ao menos uma alocação.');
    }

    for (const allocation of input.allocations) {
      if (typeof allocation.brokerId !== 'string' || allocation.brokerId.trim().length === 0) {
        throw new Error('Corretora é obrigatória.');
      }
      const quantity = Number(allocation.quantity);
      if (allocation.quantity.trim().length === 0 || Number.isNaN(quantity) || quantity <= 0) {
        throw new Error('Quantidade deve ser maior que zero.');
      }
    }
  }
}
