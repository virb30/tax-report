import { OperationalCostAllocationService } from '../../domain/ingestion/operational-cost-allocation.service';
import type { BrokerageNoteInput } from '../contracts/brokerage-note.contract';
import type { RecalculateAssetPositionUseCase } from './recalculate-asset-position-use-case';

type PersistedOperationInput = {
  tradeDate: string;
  operationType: BrokerageNoteInput['operations'][number]['operationType'];
  ticker: string;
  quantity: number;
  unitPrice: number;
  operationalCosts: number;
  irrfWithheld: number;
  broker: string;
  sourceType: BrokerageNoteInput['sourceType'];
};

type OperationWritePort = {
  create(input: PersistedOperationInput): Promise<unknown>;
};

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
    private readonly operationalCostAllocationService: OperationalCostAllocationService = new OperationalCostAllocationService(),
  ) {}

  async execute(input: BrokerageNoteInput): Promise<ImportBrokerageNoteResult> {
    const allocatedOperationalCosts = this.operationalCostAllocationService.allocate({
      totalOperationalCosts: input.totalOperationalCosts,
      operations: input.operations.map((operation) => ({
        ticker: operation.ticker,
        quantity: operation.quantity,
        unitPrice: operation.unitPrice,
      })),
    });

    const recalculationTargetsMap = new Map<string, RecalculationTarget>();

    for (let index = 0; index < input.operations.length; index += 1) {
      const operation = input.operations[index];
      const operationalCosts = allocatedOperationalCosts[index];
      if (!operation || operationalCosts === undefined) {
        throw new Error('Operation allocation mismatch.');
      }

      await this.operationWritePort.create({
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
      createdOperationsCount: input.operations.length,
      recalculatedPositionsCount: recalculationTargets.length,
    };
  }
}
