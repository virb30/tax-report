import type {
  GenerateAssetsReportQuery,
  GenerateAssetsReportResult,
} from '../../../shared/contracts/assets-report.contract';
import { AssetType } from '../../../shared/types/domain';
import { OperationType } from '../../../shared/types/domain';
import type { OperationRepositoryPort } from '../ports/operation-repository.port';
import type { PortfolioPositionRepositoryPort } from '../repositories/portfolio-position.repository.interface';

const STOCK_CLASSIFICATION = { group: '03', code: '01' } as const;
const FII_CLASSIFICATION = { group: '07', code: '03' } as const;
const ETF_CLASSIFICATION = { group: '07', code: '09' } as const;

export class GenerateAssetsReportUseCase {
  constructor(
    private readonly portfolioPositionRepository: PortfolioPositionRepositoryPort,
    private readonly operationRepository: OperationRepositoryPort,
  ) {}

  async execute(input: GenerateAssetsReportQuery): Promise<GenerateAssetsReportResult> {
    const referenceDate = `${input.baseYear}-12-31`;
    const storedPositions = await this.portfolioPositionRepository.findAll();
    const operations = await this.operationRepository.findByPeriod({
      startDate: '0000-01-01',
      endDate: referenceDate,
    });
    const allOperations = await this.operationRepository.findByPeriod({
      startDate: '0000-01-01',
      endDate: '9999-12-31',
    });

    const storedPositionsMap = new Map<string, { assetType: AssetType }>();
    for (const position of storedPositions) {
      const key = createAssetKey(position.ticker, position.broker);
      storedPositionsMap.set(key, {
        assetType: position.assetType,
      });
    }

    const computedPositions = new Map<
      string,
      { ticker: string; broker: string; assetType: AssetType; quantity: number; averagePrice: number }
    >();
    const operationKeysUntilCutoff = new Set<string>(
      operations.map((operation) => createAssetKey(operation.ticker, operation.broker)),
    );
    const postCutoffOperationsMap = createPostCutoffOperationsMap(allOperations, referenceDate);

    for (const operation of operations) {
      const key = createAssetKey(operation.ticker, operation.broker);
      const storedPosition = storedPositionsMap.get(key);
      const currentPosition = computedPositions.get(key) ?? {
        ticker: operation.ticker,
        broker: operation.broker,
        assetType: storedPosition?.assetType ?? AssetType.Stock,
        quantity: 0,
        averagePrice: 0,
      };

      if (operation.operationType === OperationType.Buy) {
        const nextQuantity = currentPosition.quantity + operation.quantity;
        const nextAveragePrice = calculateAveragePriceAfterBuy({
          currentQuantity: currentPosition.quantity,
          currentAveragePrice: currentPosition.averagePrice,
          buyQuantity: operation.quantity,
          buyUnitPrice: operation.unitPrice,
          operationalCosts: operation.operationalCosts,
        });
        computedPositions.set(key, {
          ...currentPosition,
          quantity: nextQuantity,
          averagePrice: nextAveragePrice,
        });
        continue;
      }

      if (operation.operationType === OperationType.Sell) {
        const nextQuantity = currentPosition.quantity - operation.quantity;
        computedPositions.set(key, {
          ...currentPosition,
          quantity: Math.max(0, nextQuantity),
        });
        continue;
      }

      throw new Error(`Unsupported operation type for report: ${operation.operationType as string}`);
    }

    for (const storedPosition of storedPositions) {
      const key = createAssetKey(storedPosition.ticker, storedPosition.broker);
      const hasOperationUntilCutoff = operationKeysUntilCutoff.has(key);
      if (hasOperationUntilCutoff) {
        continue;
      }
      if (!storedPosition.isManualBase) {
        continue;
      }
      if (storedPosition.quantity <= 0) {
        continue;
      }

      const rolledBackSnapshot = rollbackPositionToCutoff(storedPosition, postCutoffOperationsMap.get(key) ?? []);
      if (rolledBackSnapshot.quantity <= 0) {
        continue;
      }

      computedPositions.set(key, {
        ticker: storedPosition.ticker,
        broker: storedPosition.broker,
        assetType: storedPosition.assetType,
        quantity: rolledBackSnapshot.quantity,
        averagePrice: rolledBackSnapshot.averagePrice,
      });
    }

    for (const storedPosition of storedPositions) {
      const key = createAssetKey(storedPosition.ticker, storedPosition.broker);
      const hasOperationUntilCutoff = operationKeysUntilCutoff.has(key);
      if (!hasOperationUntilCutoff) {
        continue;
      }
      if (!storedPosition.isManualBase) {
        continue;
      }

      const rolledBackSnapshot = rollbackPositionToCutoff(storedPosition, postCutoffOperationsMap.get(key) ?? []);
      if (rolledBackSnapshot.quantity <= 0) {
        computedPositions.delete(key);
        continue;
      }

      computedPositions.set(key, {
        ticker: storedPosition.ticker,
        broker: storedPosition.broker,
        assetType: storedPosition.assetType,
        quantity: rolledBackSnapshot.quantity,
        averagePrice: rolledBackSnapshot.averagePrice,
      });
    }

    const items = [...computedPositions.values()]
      .filter((position) => position.quantity > 0)
      .map((position) => ({
        ticker: position.ticker,
        broker: position.broker,
        assetType: position.assetType,
        name: null,
        cnpj: null,
        quantity: position.quantity,
        averagePrice: position.averagePrice,
        totalCost: position.quantity * position.averagePrice,
        revenueClassification: getRevenueClassification(position.assetType),
        description: createDescription({
          ticker: position.ticker,
          broker: position.broker,
          quantity: position.quantity,
          averagePrice: position.averagePrice,
          totalCost: position.quantity * position.averagePrice,
        }),
      }));

    return {
      referenceDate,
      items,
    };
  }
}

function createAssetKey(ticker: string, broker: string): string {
  return `${ticker}::${broker}`;
}

function createPostCutoffOperationsMap(
  operations: Array<{
    ticker: string;
    broker: string;
    tradeDate: string;
    operationType: OperationType;
    quantity: number;
    unitPrice: number;
    operationalCosts: number;
  }>,
  referenceDate: string,
): Map<string, Array<{ tradeDate: string; operationType: OperationType; quantity: number; unitPrice: number; operationalCosts: number }>> {
  const postCutoffOperationsMap = new Map<
    string,
    Array<{
      tradeDate: string;
      operationType: OperationType;
      quantity: number;
      unitPrice: number;
      operationalCosts: number;
    }>
  >();

  for (const operation of operations) {
    if (operation.tradeDate <= referenceDate) {
      continue;
    }

    const key = createAssetKey(operation.ticker, operation.broker);
    const entries = postCutoffOperationsMap.get(key) ?? [];
    entries.push({
      tradeDate: operation.tradeDate,
      operationType: operation.operationType,
      quantity: operation.quantity,
      unitPrice: operation.unitPrice,
      operationalCosts: operation.operationalCosts,
    });
    postCutoffOperationsMap.set(key, entries);
  }

  return postCutoffOperationsMap;
}

function rollbackPositionToCutoff(
  position: { quantity: number; averagePrice: number },
  postCutoffOperations: Array<{
    operationType: OperationType;
    quantity: number;
    unitPrice: number;
    operationalCosts: number;
  }>,
): { quantity: number; averagePrice: number } {
  let quantity = position.quantity;
  let averagePrice = position.averagePrice;

  for (let index = postCutoffOperations.length - 1; index >= 0; index -= 1) {
    const operation = postCutoffOperations[index] as {
      operationType: OperationType;
      quantity: number;
      unitPrice: number;
      operationalCosts: number;
    };

    if (operation.operationType === OperationType.Sell) {
      quantity += operation.quantity;
      continue;
    }

    if (operation.operationType === OperationType.Buy) {
      const previousQuantity = quantity - operation.quantity;
      if (previousQuantity <= 0) {
        quantity = 0;
        averagePrice = 0;
        continue;
      }

      const currentTotalCost = quantity * averagePrice;
      const revertedBuyCost = operation.quantity * operation.unitPrice + operation.operationalCosts;
      const previousTotalCost = currentTotalCost - revertedBuyCost;
      quantity = previousQuantity;
      averagePrice = previousTotalCost / previousQuantity;
      continue;
    }

    throw new Error(`Unsupported operation type for report rollback: ${operation.operationType as string}`);
  }

  return {
    quantity,
    averagePrice,
  };
}

function calculateAveragePriceAfterBuy(input: {
  currentQuantity: number;
  currentAveragePrice: number;
  buyQuantity: number;
  buyUnitPrice: number;
  operationalCosts: number;
}): number {
  const currentTotalCost = input.currentQuantity * input.currentAveragePrice;
  const buyTotalCost = input.buyQuantity * input.buyUnitPrice;
  const nextTotalCost = currentTotalCost + buyTotalCost + input.operationalCosts;
  const nextQuantity = input.currentQuantity + input.buyQuantity;

  if (nextQuantity === 0) {
    return 0;
  }

  return nextTotalCost / nextQuantity;
}

function getRevenueClassification(assetType: AssetType): {
  group: string;
  code: string;
} {
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

function createDescription(item: {
  ticker: string;
  quantity: number;
  broker: string;
  averagePrice: number;
  totalCost: number;
}): string {
  const averagePrice = item.averagePrice.toFixed(2);
  const totalCost = item.totalCost.toFixed(2);

  return `${item.quantity} actions/units ${item.ticker} - N/A. CNPJ: N/A. Broker: ${item.broker}. Average cost: BRL ${averagePrice}. Total cost: BRL ${totalCost}.`;
}
