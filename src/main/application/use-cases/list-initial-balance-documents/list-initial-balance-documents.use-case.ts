import type { ListInitialBalanceDocumentsQuery } from '../../../../shared/contracts/initial-balance.contract';
import { AssetType } from '../../../../shared/types/domain';
import { assertSupportedYear } from '../../../../shared/utils/year';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';

export class ListInitialBalanceDocumentsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly positionRepository: AssetPositionRepository,
  ) {}

  async execute(input: ListInitialBalanceDocumentsQuery) {
    assertSupportedYear(input.year, {
      invalidTypeMessage: 'Ano inválido.',
      outOfRangeMessage: 'Ano deve estar entre 2000 e 2100.',
    });

    const [documents, positions] = await Promise.all([
      this.transactionRepository.findInitialBalanceDocumentsByYear(input.year),
      this.positionRepository.findAllByYear(input.year),
    ]);
    const assetTypeByTicker = new Map(
      positions.map((position) => [position.ticker, position.assetType]),
    );

    return {
      items: documents.map((document) => ({
        ...document,
        assetType: assetTypeByTicker.get(document.ticker) ?? AssetType.Stock,
      })),
    };
  }
}
