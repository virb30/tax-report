import { AssetType } from '../../../shared/types/domain';
import type { AssetPosition } from '../portfolio/entities/asset-position.entity';
import type { ReportItemOutput } from './report-generator.output';

import type { Asset } from '../portfolio/entities/asset.entity';
import type { Broker } from '../portfolio/entities/broker.entity';

const STOCK_CLASSIFICATION = { group: '03', code: '01' } as const;
const FII_CLASSIFICATION = { group: '07', code: '03' } as const;
const ETF_CLASSIFICATION = { group: '07', code: '09' } as const;
const BDR_CLASSIFICATION = { group: '04', code: '04' } as const;
const ASSET_UNIT_LABELS: Record<AssetType, string> = {
  [AssetType.Stock]: 'ações',
  [AssetType.Fii]: 'cotas',
  [AssetType.Etf]: 'cotas',
  [AssetType.Bdr]: 'ações',
};
const REVENUE_CLASSIFICATIONS: Record<AssetType, { group: string; code: string }> = {
  [AssetType.Stock]: STOCK_CLASSIFICATION,
  [AssetType.Fii]: FII_CLASSIFICATION,
  [AssetType.Etf]: ETF_CLASSIFICATION,
  [AssetType.Bdr]: BDR_CLASSIFICATION,
};

export function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getAssetUnitLabel(assetType: AssetType): string {
  return ASSET_UNIT_LABELS[assetType] ?? 'cotas';
}

export function getRevenueClassification(assetType: AssetType): { group: string; code: string } {
  const classification = REVENUE_CLASSIFICATIONS[assetType];

  if (classification) {
    return classification;
  }

  throw new Error(`Unsupported asset type for report: ${assetType as string}`);
}

export function buildDiscriminationText(input: {
  quantity: number;
  ticker: string;
  assetType: AssetType;
  issuerCnpj: string | null;
  brokerName: string;
  brokerCnpj: string;
  averagePrice: number;
  totalCost: number;
}): string {
  const unitLabel = getAssetUnitLabel(input.assetType);
  const avgFormatted = formatBrl(input.averagePrice);
  const totalFormatted = formatBrl(input.totalCost);
  const issuerCnpj = input.issuerCnpj ?? 'N/A';

  return `${input.quantity} ${unitLabel} ${input.ticker}. CNPJ: ${issuerCnpj}. Corretora: ${input.brokerName} (CNPJ: ${input.brokerCnpj}). Custo médio: R$ ${avgFormatted}. Custo total: R$ ${totalFormatted}.`;
}

export class ReportGenerator {
  private readonly brokersMap: Map<string, Broker>;
  private readonly assetsMap: Map<string, Asset>;

  constructor(brokers: Broker[], assets: Asset[] = []) {
    this.brokersMap = new Map(brokers.map((b) => [b.id.value, b]));
    this.assetsMap = new Map(assets.map((a) => [a.ticker, a]));
  }

  generate(positions: AssetPosition[]): ReportItemOutput[] {
    const result: ReportItemOutput[] = [];

    for (const position of positions) {
      if (position.totalQuantity <= 0) {
        continue;
      }

      const issuerCnpj = this.assetsMap.get(position.ticker)?.issuerCnpj ?? null;
      const revenueClassification = getRevenueClassification(position.assetType);
      const totalCost = Math.round(position.totalQuantity * position.averagePrice * 100) / 100;

      const allocations = position.brokerBreakdown
        .filter((a) => a.quantity > 0)
        .map((allocation) => {
          const broker = this.brokersMap.get(allocation.brokerId.value);
          const brokerName = broker?.name ?? 'Corretora não cadastrada';
          const brokerCnpj = broker?.cnpj?.value ?? 'N/A';
          const allocTotalCost =
            Math.round(allocation.quantity * position.averagePrice * 100) / 100;

          const description = buildDiscriminationText({
            quantity: allocation.quantity,
            ticker: position.ticker,
            assetType: position.assetType,
            issuerCnpj,
            brokerName,
            brokerCnpj,
            averagePrice: position.averagePrice,
            totalCost: allocTotalCost,
          });

          return {
            brokerId: allocation.brokerId.value,
            brokerName,
            cnpj: brokerCnpj,
            quantity: allocation.quantity,
            totalCost: allocTotalCost,
            description,
          };
        });

      if (allocations.length === 0) {
        continue;
      }

      result.push({
        ticker: position.ticker,
        assetType: position.assetType,
        totalQuantity: position.totalQuantity,
        averagePrice: position.averagePrice,
        totalCost,
        revenueClassification,
        allocations,
      });
    }

    return result;
  }
}
