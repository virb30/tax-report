import { describe, expect, it, jest } from '@jest/globals';
import { AssetType, OperationType, SourceType } from '../../shared/types/domain';
import type { ElectronApi } from '../../shared/types/electron-api';
import {
  runAnnualReport,
  runImportPreviewAndConfirm,
  runInitialBalanceAndRefresh,
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
      setInitialBalance: jest.fn().mockResolvedValue({
        ticker: 'IVVB11',
        brokerId: 'broker-xp',
        quantity: 2,
        averagePrice: 300,
      }),
      listPositions: jest.fn().mockResolvedValue({
        items: [
          {
            ticker: 'IVVB11',
            assetType: AssetType.Etf,
            totalQuantity: 2,
            averagePrice: 300,
            totalCost: 600,
            brokerBreakdown: [
              { brokerId: 'broker-xp', brokerName: 'XP', brokerCnpj: '00.000.000/0001-00', quantity: 2 },
            ],
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

  it('runs initial balance + positions refresh flow', async () => {
    const electronApi = createElectronApiMock();
    const result = await runInitialBalanceAndRefresh(electronApi, {
      ticker: 'IVVB11',
      brokerId: 'broker-xp',
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
    });

    expect(result).toEqual({ positionsCount: 1 });
    expect(electronApi.setInitialBalance).toHaveBeenCalledTimes(1);
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
