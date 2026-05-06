import { AssetType, PendingIssueCode, ReportItemStatus } from '../../shared/types/domain';
import type { AssetPosition } from '../../portfolio/domain/entities/asset-position.entity';

import type { Asset } from '../../portfolio/domain/entities/asset.entity';
import type { Broker } from '../../portfolio/domain/entities/broker.entity';
import type { Transaction } from '../../portfolio/domain/entities/transaction.entity';
import { DeclarationEligibilityService } from './declaration-eligibility.service';
import { HistoricalPositionService } from './historical-position.service';
import { Money } from '../../portfolio/domain/value-objects/money.vo';
import {
  ReportPositionProjectionService,
  type ReportFractionInfo,
} from './report-position-projection.service';

export interface ReportItemPendingIssueOutput {
  code: PendingIssueCode;
  message: string;
}

export interface ReportItemBrokerSummaryOutput {
  brokerId: string;
  brokerName: string;
  cnpj: string;
  quantity: number;
  totalCost: number;
}

export interface ReportItemOutput {
  ticker: string;
  assetType: AssetType;
  totalQuantity: number;
  averagePrice: number;
  previousYearValue: number;
  currentYearValue: number;
  acquiredInYear: boolean;
  revenueClassification: { group: string; code: string };
  status: ReportItemStatus;
  eligibilityReason: string;
  pendingIssues: ReportItemPendingIssueOutput[];
  canCopy: boolean;
  description: string | null;
  brokersSummary: ReportItemBrokerSummaryOutput[];
}

const STOCK_CLASSIFICATION = { group: '03', code: '01' } as const;
const FII_CLASSIFICATION = { group: '07', code: '03' } as const;
const ETF_CLASSIFICATION = { group: '07', code: '09' } as const;
const BDR_CLASSIFICATION = { group: '04', code: '04' } as const;
const ASSET_UNIT_LABELS: Record<AssetType, string> = {
  [AssetType.Stock]: 'cotas',
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

export function formatQuantity(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
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
  fractionInfo?: ReportFractionInfo | null;
  brokersSummary: Array<{
    brokerName: string;
    cnpj: string;
    quantity: number;
  }>;
}): string {
  const unitLabel = getAssetUnitLabel(input.assetType);
  const avgFormatted = formatBrl(input.averagePrice);
  const totalFormatted = formatBrl(input.currentYearValue);
  const quantityFormatted = formatQuantity(input.quantity);
  const brokersSummary = input.brokersSummary
    .map(
      (broker) =>
        `${broker.brokerName} (CNPJ: ${broker.cnpj}, ${formatQuantity(broker.quantity)} ${unitLabel})`,
    )
    .join('; ');
  const fractionDescription = input.fractionInfo
    ? ` Sendo ${formatQuantity(input.fractionInfo.quantity)} ${unitLabel} decorrentes de ${input.fractionInfo.sources
        .map((source) => `${source.eventType} em ${source.date}`)
        .join(' e ')}.`
    : '';

  return `${quantityFormatted} ${unitLabel} ${input.ticker}. CNPJ: ${input.issuerCnpj}. Corretoras: ${brokersSummary}. Custo medio: R$ ${avgFormatted}. Custo total: R$ ${totalFormatted}.${fractionDescription}`;
}

type ReportGeneratorDependencies = {
  brokers: Broker[];
  assets: Asset[];
  transactionsByTicker: Map<string, Transaction[]>;
  baseYear: number;
  previousYearPositions?: AssetPosition[];
  historicalPositionService?: HistoricalPositionService;
  declarationEligibilityService?: DeclarationEligibilityService;
  reportPositionProjectionService?: ReportPositionProjectionService;
};

type ReportItemContext = {
  asset: Asset | null;
  reportAssetType: AssetType;
  reportPosition: AssetPosition;
  fractionInfo: ReportFractionInfo | null;
  currentYearValue: Money;
  previousYearValue: Money;
};

export class ReportGenerator {
  private readonly brokersMap: Map<string, Broker>;
  private readonly assetsMap: Map<string, Asset>;
  private readonly previousYearPositionsMap: Map<string, AssetPosition>;
  private readonly historicalPositionService: HistoricalPositionService;
  private readonly declarationEligibilityService: DeclarationEligibilityService;
  private readonly reportPositionProjectionService: ReportPositionProjectionService;

  constructor(private readonly dependencies: ReportGeneratorDependencies) {
    this.brokersMap = new Map(dependencies.brokers.map((broker) => [broker.id.value, broker]));
    this.assetsMap = new Map(dependencies.assets.map((asset) => [asset.ticker, asset]));
    this.previousYearPositionsMap = new Map(
      (dependencies.previousYearPositions ?? []).map((position) => [position.ticker, position]),
    );
    this.historicalPositionService =
      dependencies.historicalPositionService ?? new HistoricalPositionService();
    this.declarationEligibilityService =
      dependencies.declarationEligibilityService ?? new DeclarationEligibilityService();
    this.reportPositionProjectionService =
      dependencies.reportPositionProjectionService ?? new ReportPositionProjectionService();
  }

  generate(positions: AssetPosition[]): ReportItemOutput[] {
    return positions
      .map((position) => this.buildReportItem(position))
      .filter((item): item is ReportItemOutput => item !== null);
  }

  private buildReportItem(position: AssetPosition): ReportItemOutput | null {
    const context = this.buildReportItemContext(position);
    const { reportPosition, reportAssetType, currentYearValue, previousYearValue, asset } = context;

    if (currentYearValue.isZero() && previousYearValue.isZero()) {
      return null;
    }

    const pendingIssues = this.buildPendingIssues(asset, reportAssetType);
    const eligibility = this.declarationEligibilityService.evaluate({
      assetType: reportAssetType,
      previousYearValue,
      currentYearValue,
      hasPendingIssues: pendingIssues.length > 0,
      isSupported: this.isSupportedAssetType(reportAssetType),
    });
    const brokersSummary = this.buildBrokersSummary(reportPosition);
    const canCopy = this.canCopyReportItem({
      position: reportPosition,
      pendingIssues,
      status: eligibility.status,
      brokersSummary,
    });

    return {
      ticker: position.ticker,
      assetType: reportAssetType,
      totalQuantity: reportPosition.totalQuantity.toNumber(),
      averagePrice: reportPosition.averagePrice.toNumber(),
      previousYearValue: previousYearValue.toNumber(),
      currentYearValue: currentYearValue.toNumber(),
      acquiredInYear: previousYearValue.isZero() && currentYearValue.isGreaterThan(0),
      revenueClassification: getRevenueClassification(reportAssetType),
      status: eligibility.status,
      eligibilityReason: eligibility.reason,
      pendingIssues,
      canCopy,
      description: this.buildDescription(context, brokersSummary, canCopy),
      brokersSummary,
    };
  }

  private buildReportItemContext(position: AssetPosition): ReportItemContext {
    const asset = this.assetsMap.get(position.ticker) ?? null;
    const reportAssetType = asset?.assetType ?? position.assetType;
    const projectedPosition = this.reportPositionProjectionService.project({
      persistedPosition: position,
      assetType: reportAssetType,
      year: this.dependencies.baseYear,
      transactions: this.dependencies.transactionsByTicker.get(position.ticker) ?? [],
    });
    const reportPosition = projectedPosition.position;

    return {
      asset,
      reportAssetType,
      reportPosition,
      fractionInfo: projectedPosition.fractionInfo,
      currentYearValue: reportPosition.averagePrice.multiplyBy(
        reportPosition.totalQuantity.getAmount(),
      ),
      previousYearValue: this.calculatePreviousYearValue(reportPosition, reportAssetType),
    };
  }

  private buildDescription(
    context: ReportItemContext,
    brokersSummary: ReportItemBrokerSummaryOutput[],
    canCopy: boolean,
  ): string | null {
    if (!canCopy || !context.asset?.issuerCnpj) {
      return null;
    }

    return buildDeclarationDescriptionText({
      quantity: context.reportPosition.totalQuantity.toNumber(),
      ticker: context.reportPosition.ticker,
      assetType: context.reportAssetType,
      issuerCnpj: context.asset.issuerCnpj,
      averagePrice: context.reportPosition.averagePrice.toNumber(),
      currentYearValue: context.currentYearValue.toNumber(),
      fractionInfo: context.fractionInfo,
      brokersSummary,
    });
  }

  private calculatePreviousYearValue(position: AssetPosition, assetType: AssetType): Money {
    const persistedPreviousYearPosition = this.previousYearPositionsMap.get(position.ticker);
    if (persistedPreviousYearPosition) {
      return persistedPreviousYearPosition.averagePrice.multiplyBy(
        persistedPreviousYearPosition.totalQuantity.getAmount(),
      );
    }

    const reconstructedPreviousYearPosition =
      this.historicalPositionService.reconstructYearEndPosition(
        position.ticker,
        assetType,
        this.dependencies.baseYear - 1,
        this.dependencies.transactionsByTicker.get(position.ticker) ?? [],
      );

    if (!reconstructedPreviousYearPosition) {
      return Money.from(0);
    }

    return reconstructedPreviousYearPosition.averagePrice.multiplyBy(
      reconstructedPreviousYearPosition.totalQuantity.getAmount(),
    );
  }

  private buildBrokersSummary(position: AssetPosition): ReportItemOutput['brokersSummary'] {
    return position.brokerBreakdown
      .filter((allocation) => allocation.quantity.toNumber() > 0)
      .map((allocation) => {
        const broker = this.brokersMap.get(allocation.brokerId.value);
        const brokerQuantity = allocation.quantity.toNumber();

        return {
          brokerId: allocation.brokerId.value,
          brokerName: broker?.name ?? 'Corretora nao cadastrada',
          cnpj: broker?.cnpj?.value ?? 'N/A',
          quantity: brokerQuantity,
          totalCost: position.averagePrice.multiplyBy(brokerQuantity).toNumber(),
        };
      });
  }

  private canCopyReportItem(input: {
    position: AssetPosition;
    pendingIssues: ReportItemPendingIssueOutput[];
    status: ReportItemStatus;
    brokersSummary: ReportItemBrokerSummaryOutput[];
  }): boolean {
    const hasCurrentPosition = input.position.totalQuantity.isLessThanOrEqualTo(0) === false;

    return (
      hasCurrentPosition &&
      input.brokersSummary.length > 0 &&
      input.pendingIssues.length === 0 &&
      input.status !== ReportItemStatus.Pending &&
      input.status !== ReportItemStatus.Unsupported
    );
  }

  private buildPendingIssues(
    asset: Asset | null,
    positionAssetType: AssetType,
  ): ReportItemPendingIssueOutput[] {
    const issues: ReportItemPendingIssueOutput[] = [];

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
}
