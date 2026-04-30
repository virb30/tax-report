import {
  AssetType,
  PendingIssueCode,
  ReportItemStatus,
} from '../../../shared/types/domain';
import type { AssetPosition } from '../portfolio/entities/asset-position.entity';
import type { ReportItemOutput } from './report-generator.output';

import type { Asset } from '../portfolio/entities/asset.entity';
import type { Broker } from '../portfolio/entities/broker.entity';
import type { Transaction } from '../portfolio/entities/transaction.entity';
import { DeclarationEligibilityService } from './declaration-eligibility.service';
import { HistoricalPositionService } from './historical-position.service';

const STOCK_CLASSIFICATION = { group: '03', code: '01' } as const;
const FII_CLASSIFICATION = { group: '07', code: '03' } as const;
const ETF_CLASSIFICATION = { group: '07', code: '09' } as const;
const BDR_CLASSIFICATION = { group: '04', code: '04' } as const;
const ASSET_UNIT_LABELS: Record<AssetType, string> = {
  [AssetType.Stock]: 'acoes',
  [AssetType.Fii]: 'cotas',
  [AssetType.Etf]: 'cotas',
  [AssetType.Bdr]: 'acoes',
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

export function getRevenueClassification(assetType: AssetType): { group: string; code: string } {
  const classification = REVENUE_CLASSIFICATIONS[assetType];

  if (classification) {
    return classification;
  }

  throw new Error(`Unsupported asset type for report: ${assetType as string}`);
}

function getAssetUnitLabel(assetType: AssetType): string {
  return ASSET_UNIT_LABELS[assetType] ?? 'cotas';
}

export function buildDeclarationDescriptionText(input: {
  quantity: number;
  ticker: string;
  assetType: AssetType;
  issuerCnpj: string;
  averagePrice: number;
  currentYearValue: number;
  brokersSummary: Array<{
    brokerName: string;
    cnpj: string;
    quantity: number;
  }>;
}): string {
  const unitLabel = getAssetUnitLabel(input.assetType);
  const avgFormatted = formatBrl(input.averagePrice);
  const totalFormatted = formatBrl(input.currentYearValue);
  const brokersSummary = input.brokersSummary
    .map(
      (broker) =>
        `${broker.brokerName} (CNPJ: ${broker.cnpj}, ${broker.quantity} ${unitLabel})`,
    )
    .join('; ');

  return `${input.quantity} ${unitLabel} ${input.ticker}. CNPJ: ${input.issuerCnpj}. Corretoras: ${brokersSummary}. Custo medio: R$ ${avgFormatted}. Custo total: R$ ${totalFormatted}.`;
}

type ReportGeneratorDependencies = {
  brokers: Broker[];
  assets: Asset[];
  transactionsByTicker: Map<string, Transaction[]>;
  baseYear: number;
  historicalPositionService?: HistoricalPositionService;
  declarationEligibilityService?: DeclarationEligibilityService;
};

export class ReportGenerator {
  private readonly brokersMap: Map<string, Broker>;
  private readonly assetsMap: Map<string, Asset>;
  private readonly historicalPositionService: HistoricalPositionService;
  private readonly declarationEligibilityService: DeclarationEligibilityService;

  constructor(private readonly dependencies: ReportGeneratorDependencies) {
    this.brokersMap = new Map(dependencies.brokers.map((broker) => [broker.id.value, broker]));
    this.assetsMap = new Map(dependencies.assets.map((asset) => [asset.ticker, asset]));
    this.historicalPositionService =
      dependencies.historicalPositionService ?? new HistoricalPositionService();
    this.declarationEligibilityService =
      dependencies.declarationEligibilityService ?? new DeclarationEligibilityService();
  }

  generate(positions: AssetPosition[]): ReportItemOutput[] {
    const result: ReportItemOutput[] = [];

    for (const position of positions) {
      if (position.totalQuantity <= 0) {
        continue;
      }

      const currentYearValue = this.roundCurrency(position.totalQuantity * position.averagePrice);
      const previousYearPosition = this.historicalPositionService.reconstructYearEndPosition(
        position.ticker,
        position.assetType,
        this.dependencies.baseYear - 1,
        this.dependencies.transactionsByTicker.get(position.ticker) ?? [],
      );
      const previousYearValue = previousYearPosition
        ? this.roundCurrency(previousYearPosition.totalQuantity * previousYearPosition.averagePrice)
        : 0;
      const asset = this.assetsMap.get(position.ticker) ?? null;
      const pendingIssues = this.buildPendingIssues(asset, position.assetType);
      const isSupported = this.isSupportedAssetType(position.assetType);
      const eligibility = this.declarationEligibilityService.evaluate({
        assetType: position.assetType,
        previousYearValue,
        currentYearValue,
        hasPendingIssues: pendingIssues.length > 0,
        isSupported,
      });
      const brokersSummary = position.brokerBreakdown
        .filter((allocation) => allocation.quantity > 0)
        .map((allocation) => {
          const broker = this.brokersMap.get(allocation.brokerId.value);
          const brokerName = broker?.name ?? 'Corretora nao cadastrada';
          const brokerCnpj = broker?.cnpj?.value ?? 'N/A';

          return {
            brokerId: allocation.brokerId.value,
            brokerName,
            cnpj: brokerCnpj,
            quantity: allocation.quantity,
            totalCost: this.roundCurrency(allocation.quantity * position.averagePrice),
          };
        });

      if (brokersSummary.length === 0) {
        continue;
      }

      const canCopy =
        pendingIssues.length === 0 &&
        eligibility.status !== ReportItemStatus.Pending &&
        eligibility.status !== ReportItemStatus.Unsupported;

      result.push({
        ticker: position.ticker,
        assetType: position.assetType,
        totalQuantity: position.totalQuantity,
        averagePrice: position.averagePrice,
        previousYearValue,
        currentYearValue,
        acquiredInYear: previousYearValue === 0 && currentYearValue > 0,
        revenueClassification: getRevenueClassification(position.assetType),
        status: eligibility.status,
        eligibilityReason: eligibility.reason,
        pendingIssues,
        canCopy,
        description:
          canCopy && asset?.issuerCnpj
            ? buildDeclarationDescriptionText({
                quantity: position.totalQuantity,
                ticker: position.ticker,
                assetType: position.assetType,
                issuerCnpj: asset.issuerCnpj,
                averagePrice: position.averagePrice,
                currentYearValue,
                brokersSummary,
              })
            : null,
        brokersSummary,
      });
    }

    return result;
  }

  private buildPendingIssues(
    asset: Asset | null,
    positionAssetType: AssetType,
  ): Array<{ code: PendingIssueCode; message: string }> {
    const issues: Array<{ code: PendingIssueCode; message: string }> = [];

    if (!this.isSupportedAssetType(positionAssetType)) {
      issues.push({
        code: PendingIssueCode.UnsupportedScope,
        message: 'Ativo fora do escopo suportado para declaracao.',
      });
    }

    if (asset?.assetType === null || asset === null) {
      issues.push({
        code: PendingIssueCode.MissingAssetType,
        message: 'Tipo canonico do ativo nao foi confirmado no catalogo.',
      });
    }

    if (asset?.name === null || asset === null) {
      issues.push({
        code: PendingIssueCode.MissingIssuerName,
        message: 'Nome do emissor ausente no catalogo do ativo.',
      });
    }

    if (asset?.issuerCnpj === null || asset === null) {
      issues.push({
        code: PendingIssueCode.MissingIssuerCnpj,
        message: 'CNPJ do emissor ausente no catalogo do ativo.',
      });
    }

    return issues;
  }

  private isSupportedAssetType(assetType: AssetType): boolean {
    return Object.values(AssetType).includes(assetType);
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
