import { TaxApportioner } from '../../domain/ingestion/tax-apportioner.service';
import type { BrokerageNoteInput } from '../contracts/brokerage-note.contract';
import type { OperationWritePort } from '../ports/operation-write.port';
import type { RecalculateAssetPositionUseCase } from './recalculate-asset-position-use-case';

export type ImportBrokerageNoteResult = {
  createdOperationsCount: number;
  recalculatedPositionsCount: number;
};

type RecalculationTarget = {
  ticker: string;
  broker: string;
  assetType: BrokerageNoteInput['operations'][number]['assetType'];
};

export class ImportBrokerageNoteUseCase {
  constructor(
    private readonly operationWritePort: OperationWritePort,
    private readonly recalculateAssetPositionUseCase: RecalculateAssetPositionUseCase,
    private readonly taxApportioner: TaxApportioner = new TaxApportioner(),
  ) {}

  async execute(input: BrokerageNoteInput): Promise<ImportBrokerageNoteResult> {
    const importBatchId = input.importBatchId ?? createImportBatchId();
    const allocatedOperationalCosts = this.taxApportioner.allocate({
      totalOperationalCosts: input.totalOperationalCosts,
      operations: input.operations.map((operation) => ({
        ticker: operation.ticker,
        quantity: operation.quantity,
        unitPrice: operation.unitPrice,
      })),
    });

    const recalculationTargetsMap = new Map<string, RecalculationTarget>();
    let createdOperationsCount = 0;

    for (let index = 0; index < input.operations.length; index += 1) {
      const operation = input.operations[index];
      const operationalCosts = allocatedOperationalCosts[index];
      if (!operation || operationalCosts === undefined) {
        throw new Error('Operation allocation mismatch.');
      }

      const externalRef = createExternalRef({
        operationIndex: index,
        tradeDate: input.tradeDate,
        operationType: operation.operationType,
        ticker: operation.ticker,
        quantity: operation.quantity,
        unitPrice: operation.unitPrice,
        operationalCosts,
        irrfWithheld: operation.irrfWithheld,
        broker: input.broker,
        sourceType: input.sourceType,
      });
      const hasCreatedOperation = await this.operationWritePort.createIfNotExists({
        tradeDate: input.tradeDate,
        operationType: operation.operationType,
        ticker: operation.ticker,
        quantity: operation.quantity,
        unitPrice: operation.unitPrice,
        operationalCosts,
        irrfWithheld: operation.irrfWithheld,
        broker: input.broker,
        sourceType: input.sourceType,
        externalRef,
        importBatchId,
      });
      if (!hasCreatedOperation) {
        continue;
      }
      createdOperationsCount += 1;

      const recalculationKey = `${operation.ticker}::${input.broker}`;
      if (!recalculationTargetsMap.has(recalculationKey)) {
        recalculationTargetsMap.set(recalculationKey, {
          ticker: operation.ticker,
          broker: input.broker,
          assetType: operation.assetType,
        });
      }
    }

    const recalculationTargets = [...recalculationTargetsMap.values()];
    for (const target of recalculationTargets) {
      await this.recalculateAssetPositionUseCase.execute(target);
    }

    return {
      createdOperationsCount,
      recalculatedPositionsCount: recalculationTargets.length,
    };
  }
}

function createImportBatchId(): string {
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createExternalRef(input: {
  operationIndex: number;
  tradeDate: string;
  operationType: BrokerageNoteInput['operations'][number]['operationType'];
  ticker: string;
  quantity: number;
  unitPrice: number;
  operationalCosts: number;
  irrfWithheld: number;
  broker: string;
  sourceType: BrokerageNoteInput['sourceType'];
}): string {
  return [
    input.operationIndex.toString(),
    input.tradeDate,
    input.operationType,
    input.ticker,
    input.quantity.toString(),
    input.unitPrice.toFixed(8),
    input.operationalCosts.toFixed(8),
    input.irrfWithheld.toFixed(8),
    input.broker,
    input.sourceType,
  ].join('|');
}
