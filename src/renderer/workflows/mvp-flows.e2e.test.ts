import { describe, expect, it, jest } from '@jest/globals';
import { AssetType, OperationType, SourceType } from '../../shared/types/domain';
import type { ElectronApi } from '../../shared/types/electron-api';
import {
  runAnnualReport,
  runImportPreviewAndConfirm,
  runManualBaseAndRefresh,
} from './mvp-flows';

describe('MVP renderer workflows (E2E)', () => {
  function createElectronApiMock(): ElectronApi {
    return {
      appName: 'tax-report',
      previewImportFromFile: jest.fn().mockResolvedValue({
        commands: [
          {
            tradeDate: '2025-02-10',
            broker: 'XP',
            sourceType: SourceType.Csv,
            totalOperationalCosts: 3,
            operations: [
              {
                ticker: 'PETR4',
                assetType: AssetType.Stock,
                operationType: OperationType.Buy,
                quantity: 10,
                unitPrice: 20,
                irrfWithheld: 0,
              },
            ],
          },
        ],
      }),
      importOperations: jest.fn(),
      confirmImportOperations: jest.fn().mockResolvedValue({
        createdOperationsCount: 1,
        recalculatedPositionsCount: 1,
      }),
      setManualBase: jest.fn().mockResolvedValue({
        ticker: 'IVVB11',
        broker: 'XP',
        quantity: 2,
        averagePrice: 300,
        isManualBase: true,
      }),
      listPositions: jest.fn().mockResolvedValue({
        items: [
          {
            ticker: 'IVVB11',
            broker: 'XP',
            assetType: AssetType.Etf,
            quantity: 2,
            averagePrice: 300,
            totalCost: 600,
            isManualBase: true,
          },
        ],
      }),
      generateAssetsReport: jest.fn().mockResolvedValue({
        referenceDate: '2025-12-31',
        items: [
          {
            ticker: 'IVVB11',
            broker: 'XP',
            assetType: AssetType.Etf,
            quantity: 2,
            averagePrice: 300,
            totalCost: 600,
            revenueClassification: { group: '07', code: '09' },
            description: '2 actions/units IVVB11 - N/A. CNPJ: N/A. Broker: XP.',
          },
        ],
      }),
    };
  }

  it('runs import preview + confirm flow', async () => {
    const electronApi = createElectronApiMock();
    const result = await runImportPreviewAndConfirm(electronApi, {
      broker: 'XP',
      filePath: '/tmp/movements.csv',
    });

    expect(result).toEqual({
      createdOperationsCount: 1,
      recalculatedPositionsCount: 1,
    });
    expect(electronApi.previewImportFromFile).toHaveBeenCalledWith({
      broker: 'XP',
      filePath: '/tmp/movements.csv',
    });
    expect(electronApi.confirmImportOperations).toHaveBeenCalledTimes(1);
  });

  it('runs manual base + positions refresh flow', async () => {
    const electronApi = createElectronApiMock();
    const result = await runManualBaseAndRefresh(electronApi, {
      ticker: 'IVVB11',
      broker: 'XP',
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
    });

    expect(result).toEqual({ positionsCount: 1 });
    expect(electronApi.setManualBase).toHaveBeenCalledTimes(1);
    expect(electronApi.listPositions).toHaveBeenCalledTimes(1);
  });

  it('runs annual report flow', async () => {
    const electronApi = createElectronApiMock();
    const result = await runAnnualReport(electronApi, {
      baseYear: 2025,
    });

    expect(result).toEqual({
      itemsCount: 1,
      referenceDate: '2025-12-31',
    });
    expect(electronApi.generateAssetsReport).toHaveBeenCalledWith({
      baseYear: 2025,
    });
  });
});
