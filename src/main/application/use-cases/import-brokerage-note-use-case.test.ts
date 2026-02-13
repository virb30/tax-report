import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AssetType, OperationType, SourceType } from '../../../shared/types/domain';
import { OperationalCostAllocationService } from '../../domain/ingestion/operational-cost-allocation.service';
import { ImportBrokerageNoteUseCase } from './import-brokerage-note-use-case';
import type { RecalculateAssetPositionUseCase } from './recalculate-asset-position-use-case';

describe('ImportBrokerageNoteUseCase', () => {
  let operationWritePort: { create: jest.Mock };
  let recalculateAssetPositionUseCase: RecalculateAssetPositionUseCase;
  let executeRecalculateSpy: jest.Mock;
  let useCase: ImportBrokerageNoteUseCase;

  beforeEach(() => {
    operationWritePort = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    executeRecalculateSpy = jest.fn().mockResolvedValue(undefined);
    recalculateAssetPositionUseCase = {
      execute: executeRecalculateSpy,
    } as unknown as RecalculateAssetPositionUseCase;

    useCase = new ImportBrokerageNoteUseCase(
      operationWritePort,
      recalculateAssetPositionUseCase,
      new OperationalCostAllocationService(),
    );
  });

  it('allocates costs and persists operations before recalculating unique positions', async () => {
    const result = await useCase.execute({
      tradeDate: '2025-02-01',
      broker: 'XP',
      sourceType: SourceType.Pdf,
      totalOperationalCosts: 1,
      operations: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          operationType: OperationType.Buy,
          quantity: 1,
          unitPrice: 10,
          irrfWithheld: 0,
        },
        {
          ticker: 'VALE3',
          assetType: AssetType.Stock,
          operationType: OperationType.Buy,
          quantity: 2,
          unitPrice: 10,
          irrfWithheld: 0,
        },
      ],
    });

    expect(operationWritePort.create).toHaveBeenCalledTimes(2);
    expect(operationWritePort.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ ticker: 'PETR4', operationalCosts: 0.33 }),
    );
    expect(operationWritePort.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ ticker: 'VALE3', operationalCosts: 0.67 }),
    );
    expect(executeRecalculateSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      createdOperationsCount: 2,
      recalculatedPositionsCount: 2,
    });
  });

  it('recalculates each ticker only once even when note has repeated ticker', async () => {
    await useCase.execute({
      tradeDate: '2025-02-01',
      broker: 'XP',
      sourceType: SourceType.Pdf,
      totalOperationalCosts: 0.5,
      operations: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          operationType: OperationType.Buy,
          quantity: 5,
          unitPrice: 20,
          irrfWithheld: 0,
        },
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          operationType: OperationType.Buy,
          quantity: 5,
          unitPrice: 30,
          irrfWithheld: 0,
        },
      ],
    });

    expect(operationWritePort.create).toHaveBeenCalledTimes(2);
    expect(executeRecalculateSpy).toHaveBeenCalledTimes(1);
    expect(executeRecalculateSpy).toHaveBeenCalledWith({
      ticker: 'PETR4',
      broker: 'XP',
      assetType: AssetType.Stock,
    });
  });

  it('throws when allocated costs and operations are inconsistent', async () => {
    const invalidAllocationService = {
      allocate: jest.fn().mockReturnValue([]),
    } as unknown as OperationalCostAllocationService;
    const invalidUseCase = new ImportBrokerageNoteUseCase(
      operationWritePort,
      recalculateAssetPositionUseCase,
      invalidAllocationService,
    );

    await expect(
      invalidUseCase.execute({
        tradeDate: '2025-02-01',
        broker: 'XP',
        sourceType: SourceType.Pdf,
        totalOperationalCosts: 1,
        operations: [
          {
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            operationType: OperationType.Buy,
            quantity: 1,
            unitPrice: 10,
            irrfWithheld: 0,
          },
        ],
      }),
    ).rejects.toThrow('Operation allocation mismatch.');
  });
});
