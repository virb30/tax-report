import { AssetTypeSource } from '../../../../../shared/types/domain';
import { Asset } from '../../../domain/entities/asset.entity';
import type { AssetRepository } from '../../repositories/asset.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import type { ReprocessTickerYearsService } from '../../services/reprocess-ticker-years.service';
import type { RepairAssetTypeInput } from './repair-asset-type.input';
import type { RepairAssetTypeOutput } from './repair-asset-type.output';

export class RepairAssetTypeUseCase {
  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly reprocessTickerYearsService: ReprocessTickerYearsService,
  ) {}

  async execute(input: RepairAssetTypeInput): Promise<RepairAssetTypeOutput> {
    const transactions = await this.transactionRepository.findByTicker(input.ticker);
    if (transactions.length === 0) {
      throw new Error('Nenhum historico encontrado para o ticker informado.');
    }

    const asset =
      (await this.assetRepository.findByTicker(input.ticker)) ??
      Asset.create({
        ticker: input.ticker,
      });
    asset.changeAssetType(input.assetType, AssetTypeSource.Manual);
    await this.assetRepository.save(asset);

    const affectedYears = [
      ...new Set(transactions.map((transaction) => Number(transaction.date.slice(0, 4)))),
    ].sort((left, right) => left - right);
    const { reprocessedCount } = await this.reprocessTickerYearsService.execute({
      ticker: input.ticker,
      assetType: input.assetType,
      affectedYears,
    });

    return {
      ticker: input.ticker,
      assetType: input.assetType,
      affectedYears,
      reprocessedCount,
    };
  }
}
