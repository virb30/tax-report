import { AssetType } from '../../../../shared/types/domain';
import type { ReportItemInput } from './report-generator.input';
import type { ReportItemOutput } from './report-generator.output';

const STOCK_CLASSIFICATION = { group: '03', code: '01' } as const;
const FII_CLASSIFICATION = { group: '07', code: '03' } as const;
const ETF_CLASSIFICATION = { group: '07', code: '09' } as const;



export function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getAssetUnitLabel(assetType: AssetType): string {
  if (assetType === AssetType.Stock || assetType === AssetType.Bdr) {
    return 'ações';
  }
  return 'cotas';
}

export function getRevenueClassification(assetType: AssetType): { group: string; code: string } {
  if (assetType === AssetType.Stock || assetType === AssetType.Bdr) {
    return STOCK_CLASSIFICATION;
  }
  if (assetType === AssetType.Fii) {
    return FII_CLASSIFICATION;
  }
  if (assetType === AssetType.Etf) {
    return ETF_CLASSIFICATION;
  }
  throw new Error(`Unsupported asset type for report: ${assetType as string}`);
}

export function buildDiscriminationText(input: {
  quantity: number;
  ticker: string;
  assetType: AssetType;
  issuerCnpj: string;
  brokerName: string;
  averagePrice: number;
  totalCost: number;
}): string {
  const unitLabel = getAssetUnitLabel(input.assetType);
  const avgFormatted = formatBrl(input.averagePrice);
  const totalFormatted = formatBrl(input.totalCost);

  return `${input.quantity} ${unitLabel} ${input.ticker}. CNPJ: ${input.issuerCnpj}. Corretora: ${input.brokerName}. Custo médio: R$ ${avgFormatted}. Custo total: R$ ${totalFormatted}.`;
}

export class ReportGenerator {
  generate(items: ReportItemInput[]): ReportItemOutput[] {
    const result: ReportItemOutput[] = [];

    for (const { position, brokersMap, issuerCnpj } of items) {
      if (position.totalQuantity <= 0) {
        continue;
      }

      const revenueClassification = getRevenueClassification(position.assetType);
      const totalCost = Math.round(position.totalQuantity * position.averagePrice * 100) / 100;

      const allocations = position.brokerBreakdown
        .filter((a) => a.quantity > 0)
        .map((allocation) => {
          const broker = brokersMap.get(allocation.brokerId.value);
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
