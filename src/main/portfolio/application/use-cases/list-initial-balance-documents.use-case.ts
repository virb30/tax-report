import { AssetType } from '../../../shared/types/domain';
import { assertSupportedYear } from '../../../../shared/utils/year';
import type { AssetRepository } from '../repositories/asset.repository';
import type { AssetPositionRepository } from '../repositories/asset-position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';

export interface ListInitialBalanceDocumentsInput {
  year: number;
}

export class ListInitialBalanceDocumentsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly positionRepository: AssetPositionRepository,
    private readonly assetRepository: AssetRepository,
  ) {}

  async execute(input: ListInitialBalanceDocumentsInput) {
    assertSupportedYear(input.year, {
      invalidTypeMessage: 'Ano inválido.',
      outOfRangeMessage: 'Ano deve estar entre 2000 e 2100.',
    });

    const [documents, positions] = await Promise.all([
      this.transactionRepository.findInitialBalanceDocumentsByYear(input.year),
      this.positionRepository.findAllByYear(input.year),
    ]);

    const tickers = [...new Set(documents.map((document) => document.ticker))];
    const assets = await this.assetRepository.findByTickersList(tickers);
    const assetByTicker = new Map(assets.map((asset) => [asset.ticker, asset]));
    const catalogAssetTypeByTicker = new Map(
      assets
        .filter((asset) => asset.assetType !== null)
        .map((asset) => [asset.ticker, asset.assetType]),
    );
    const assetTypeByTicker = new Map(
      positions.map((position) => [
        position.ticker,
        catalogAssetTypeByTicker.get(position.ticker) ?? position.assetType,
      ]),
    );

    return {
      items: documents.map((document) => ({
        ...document,
        name: assetByTicker.get(document.ticker)?.name ?? null,
        cnpj: assetByTicker.get(document.ticker)?.issuerCnpj ?? null,
        assetType:
          catalogAssetTypeByTicker.get(document.ticker) ??
          assetTypeByTicker.get(document.ticker) ??
          AssetType.Stock,
      })),
    };
  }
}
