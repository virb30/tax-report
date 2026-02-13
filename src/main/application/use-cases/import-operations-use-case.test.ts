import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AssetType, OperationType, SourceType } from '../../../shared/types/domain';
import { ImportOperationsUseCase } from './import-operations-use-case';
import type { ImportBrokerageNoteUseCase } from './import-brokerage-note-use-case';

describe('ImportOperationsUseCase', () => {
  let importBrokerageNoteUseCase: ImportBrokerageNoteUseCase;
  let executeSpy: jest.Mock;
  let useCase: ImportOperationsUseCase;

  beforeEach(() => {
    executeSpy = jest.fn().mockResolvedValue({
      createdOperationsCount: 1,
      recalculatedPositionsCount: 1,
    });
    importBrokerageNoteUseCase = {
      execute: executeSpy,
    } as unknown as ImportBrokerageNoteUseCase;
    useCase = new ImportOperationsUseCase(importBrokerageNoteUseCase);
  });

  it('delegates command execution to ImportBrokerageNoteUseCase', async () => {
    const command = {
      tradeDate: '2025-02-01',
      broker: 'XP',
      sourceType: SourceType.Pdf,
      totalOperationalCosts: 0,
      operations: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          operationType: OperationType.Buy,
          quantity: 10,
          unitPrice: 10,
          irrfWithheld: 0,
        },
      ],
    };

    const result = await useCase.execute(command);

    expect(executeSpy).toHaveBeenCalledWith(command);
    expect(result).toEqual({
      createdOperationsCount: 1,
      recalculatedPositionsCount: 1,
    });
  });
});
