import { AssetType } from '../../../shared/types/domain';
import type { AssetPositionSnapshot } from '../portfolio/asset-position.entity';
import type { BrokerRecord } from '../portfolio/broker.entity';

const STOCK_CLASSIFICATION = { group: '03', code: '01' } as const;
const FII_CLASSIFICATION = { group: '07', code: '03' } as const;
const ETF_CLASSIFICATION = { group: '07', code: '09' } as const;

export type ReportItemInput = {
  position: AssetPositionSnapshot;
  brokersMap: Map<string, BrokerRecord>;
  /** CNPJ do emissor (empresa do ativo), de ticker_data. Usar "N/A" quando não cadastrado. */
  issuerCnpj: string;
};

export type ReportItemOutput = {
  ticker: string;
  assetType: AssetType;
  totalQuantity: number;
  averagePrice: number;
  totalCost: number;
  revenueClassification: { group: string; code: string };
  allocations: Array<{
    brokerId: string;
    brokerName: string;
    cnpj: string;
    quantity: number;
    totalCost: number;
    description: string;
  }>;
};

/**
 * Formata valor monetário no padrão brasileiro (R$ 1.234,56).
 */
export function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Retorna o termo correto para quantidade: "ações" (stock/bdr) ou "cotas" (fii/etf).
 */
function getAssetUnitLabel(assetType: AssetType): string {
  if (assetType === AssetType.Stock || assetType === AssetType.Bdr) {
    return 'ações';
  }
  return 'cotas';
}

/**
 * Retorna classificação RFB por tipo de ativo.
 */
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

/**
 * Gera o texto de discriminação no formato RFB para uma alocação por corretora.
 * Formato: "[QTD] ações/cotas [TICKER]. CNPJ: [CNPJ emissor]. Corretora: [NOME]. Custo médio: R$ [PM]. Custo total: R$ [TOTAL]."
 * O CNPJ é do emissor do ativo (empresa), vindo de ticker_data. Use "N/A" quando não cadastrado.
 */
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

/**
 * Serviço de domínio que gera relatório de Bens e Direitos a partir de posições consolidadas e dados de corretoras.
 */
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
          const broker = brokersMap.get(allocation.brokerId);
          const brokerName = broker?.name ?? 'Corretora não cadastrada';
          const brokerCnpj = broker?.cnpj ?? 'N/A';
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
            brokerId: allocation.brokerId,
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
