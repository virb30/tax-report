import {
  type AssetType,
  AssetTypeSource,
  SourceType,
  TransactionType,
} from '../../../shared/types/domain';
import { assertSupportedYear } from '../../../../shared/utils/year';
import { Asset } from '../../domain/entities/asset.entity';
import type { TransactionRepository } from '../repositories/transaction.repository';
import type { AssetRepository } from '../repositories/asset.repository';
import type { InitialBalanceDocumentPositionSyncService } from '../services/initial-balance-document-position-sync.service';
import { Transaction } from '../../domain/entities/transaction.entity';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { Quantity } from '../../domain/value-objects/quantity.vo';
import { Money } from '../../domain/value-objects/money.vo';
import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';

export interface InitialBalanceAllocationInput {
  brokerId: string;
  quantity: string;
}

export interface SaveInitialBalanceDocumentInput {
  ticker: string;
  year: number;
  assetType: AssetType;
  name?: string;
  cnpj?: string;
  averagePrice: string;
  allocations: InitialBalanceAllocationInput[];
}

export interface InitialBalanceAllocationOutput {
  brokerId: string;
  quantity: string;
}

export interface SaveInitialBalanceDocumentOutput {
  ticker: string;
  year: number;
  assetType: AssetType;
  name?: string | null;
  cnpj?: string | null;
  averagePrice: string;
  allocations: InitialBalanceAllocationOutput[];
  totalQuantity: string;
}

export class SaveInitialBalanceDocumentUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly initialBalanceDocumentPositionSyncService: InitialBalanceDocumentPositionSyncService,
    private readonly assetRepository: AssetRepository,
  ) {}

  async execute(input: SaveInitialBalanceDocumentInput): Promise<SaveInitialBalanceDocumentOutput> {
    this.validate(input);

    const averagePrice = Money.from(input.averagePrice);
    const asset = await this.persistAssetCatalog(input);

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
      name: asset.name,
      cnpj: asset.issuerCnpj,
      averagePrice: averagePrice.getAmount(),
      allocations: input.allocations,
      totalQuantity: position.totalQuantity.getAmount(),
    };
  }

  private async persistAssetCatalog(input: SaveInitialBalanceDocumentInput): Promise<Asset> {
    const asset =
      (await this.assetRepository.findByTicker(input.ticker)) ??
      Asset.create({
        ticker: input.ticker,
      });
    const normalizedName = this.normalizeOptionalText(input.name);
    const normalizedCnpj = this.normalizeOptionalText(input.cnpj);

    asset.changeAssetType(input.assetType, AssetTypeSource.Manual);

    if (normalizedName !== undefined && this.isMissingAssetName(asset)) {
      asset.changeName(normalizedName);
    }

    if (normalizedCnpj !== undefined && asset.issuerCnpj === null) {
      asset.changeIssuerCnpj(new Cnpj(normalizedCnpj));
    }

    await this.assetRepository.save(asset);

    return asset;
  }

  private isMissingAssetName(asset: Asset): boolean {
    return asset.name === null || asset.name.trim().length === 0;
  }

  private normalizeOptionalText(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : undefined;
  }

  private validate(input: SaveInitialBalanceDocumentInput): void {
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
    if (input.name !== undefined && typeof input.name !== 'string') {
      throw new Error('Nome do emissor inválido.');
    }
    if (input.cnpj !== undefined && typeof input.cnpj !== 'string') {
      throw new Error('CNPJ inválido.');
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
