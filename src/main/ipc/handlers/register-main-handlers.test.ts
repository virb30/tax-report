import { describe, expect, it, jest } from '@jest/globals';
import { AssetType, OperationType, SourceType } from '../../../shared/types/domain';
import {
  registerMainHandlers,
  type MainHandlersDependencies,
} from './register-main-handlers';

describe('registerMainHandlers', () => {
  function createDependencies() {
    return {
      checkHealth: jest.fn().mockReturnValue({ status: 'ok' }),
      previewImportFromFile: jest.fn().mockResolvedValue({
        commands: [],
      }),
      importOperations: jest.fn().mockResolvedValue({
        createdOperationsCount: 1,
        recalculatedPositionsCount: 1,
      }),
      confirmImportOperations: jest.fn().mockResolvedValue({
        createdOperationsCount: 2,
        recalculatedPositionsCount: 2,
      }),
      setInitialBalance: jest.fn().mockResolvedValue({
        ticker: 'PETR4',
        brokerId: 'broker-xp',
        quantity: 10,
        averagePrice: 20,
      }),
      listPositions: jest.fn().mockResolvedValue({
        items: [],
      }),
      generateAssetsReport: jest.fn().mockResolvedValue({
        referenceDate: '2025-12-31',
        items: [],
      }),
      listBrokers: jest.fn().mockResolvedValue({ items: [] }),
      createBroker: jest.fn().mockResolvedValue({
        success: true,
        broker: { id: 'broker-1', name: 'Test', cnpj: '00.000.000/0001-00' },
      }),
    };
  }

  it('registers all channels and returns channel list', () => {
    const handle = jest.fn();
    const dependencies = createDependencies();

    const channels = registerMainHandlers({ handle }, dependencies as MainHandlersDependencies);

    expect(channels).toEqual([
      'app:health-check',
      'import:preview-file',
      'import:operations',
      'import:confirm-operations',
      'portfolio:set-initial-balance',
      'portfolio:list-positions',
      'report:assets-annual',
      'brokers:list',
      'brokers:create',
    ]);
    expect(handle).toHaveBeenCalledTimes(9);
    expect(handle).toHaveBeenCalledWith('app:health-check', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('import:preview-file', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('import:operations', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('import:confirm-operations', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('portfolio:set-initial-balance', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('portfolio:list-positions', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('report:assets-annual', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('brokers:list', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('brokers:create', expect.any(Function));
  });

  it('delegates payload handling to dependencies', async () => {
    const handle = jest.fn();
    const dependencies = createDependencies();
    registerMainHandlers({ handle }, dependencies as MainHandlersDependencies);

    const healthHandler = handle.mock.calls[0]?.[1] as (() => unknown) | undefined;
    const previewHandler = handle.mock.calls[1]?.[1] as
      | ((_event: unknown, input: { broker: string; filePath: string }) => Promise<unknown>)
      | undefined;
    const importHandler = handle.mock.calls[2]?.[1] as
      | ((_event: unknown, input: unknown) => Promise<unknown>)
      | undefined;
    const confirmHandler = handle.mock.calls[3]?.[1] as
      | ((_event: unknown, input: unknown) => Promise<unknown>)
      | undefined;
    const setInitialBalanceHandler = handle.mock.calls[4]?.[1] as
      | ((_event: unknown, input: unknown) => Promise<unknown>)
      | undefined;
    const listPositionsHandler = handle.mock.calls[5]?.[1] as (() => Promise<unknown>) | undefined;
    const reportHandler = handle.mock.calls[6]?.[1] as
      | ((_event: unknown, input: { baseYear: number }) => Promise<unknown>)
      | undefined;

    if (
      !healthHandler ||
      !previewHandler ||
      !importHandler ||
      !confirmHandler ||
      !setInitialBalanceHandler ||
      !listPositionsHandler ||
      !reportHandler
    ) {
      throw new Error('IPC handlers were not fully registered.');
    }

    const previewInput = {
      broker: 'XP',
      filePath: '/tmp/operations.csv',
    };
    const importInput = {
      tradeDate: '2025-03-10',
      broker: 'XP',
      sourceType: SourceType.Csv,
      totalOperationalCosts: 4,
      operations: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          operationType: OperationType.Buy,
          quantity: 10,
          unitPrice: 30,
          irrfWithheld: 0,
        },
      ],
    };
    const confirmInput = {
      commands: [importInput],
    };
    const initialBalanceInput = {
      ticker: 'ITSA4',
      brokerId: 'broker-xp',
      assetType: AssetType.Stock,
      quantity: 20,
      averagePrice: 10,
    };
    const reportInput = { baseYear: 2025 };

    expect(healthHandler()).toEqual({ status: 'ok' });
    await previewHandler({}, previewInput);
    await importHandler({}, importInput);
    await confirmHandler({}, confirmInput);
    await setInitialBalanceHandler({}, initialBalanceInput);
    await listPositionsHandler();
    await reportHandler({}, reportInput);

    expect(dependencies.checkHealth).toHaveBeenCalledTimes(1);
    expect(dependencies.previewImportFromFile).toHaveBeenCalledWith(previewInput);
    expect(dependencies.importOperations).toHaveBeenCalledWith(importInput);
    expect(dependencies.confirmImportOperations).toHaveBeenCalledWith(confirmInput);
    expect(dependencies.setInitialBalance).toHaveBeenCalledWith(initialBalanceInput);
    expect(dependencies.listPositions).toHaveBeenCalledTimes(1);
    expect(dependencies.generateAssetsReport).toHaveBeenCalledWith(reportInput);
  });

  it('rejects invalid payloads before invoking dependencies', () => {
    const handle = jest.fn();
    const dependencies = createDependencies();
    registerMainHandlers({ handle }, dependencies as MainHandlersDependencies);

    const previewHandler = handle.mock.calls[1]?.[1] as (_event: unknown, input: unknown) => unknown;
    const importHandler = handle.mock.calls[2]?.[1] as (_event: unknown, input: unknown) => unknown;
    const confirmHandler = handle.mock.calls[3]?.[1] as (_event: unknown, input: unknown) => unknown;
    const setInitialBalanceHandler = handle.mock.calls[4]?.[1] as (_event: unknown, input: unknown) => unknown;
    const reportHandler = handle.mock.calls[6]?.[1] as (_event: unknown, input: unknown) => unknown;

    expect(() => previewHandler({}, null)).toThrow('Invalid payload for import preview.');
    expect(() => previewHandler({}, { broker: '', filePath: '/tmp/ops.csv' })).toThrow(
      'Invalid broker for import preview.',
    );
    expect(() => previewHandler({}, { broker: 'XP', filePath: '' })).toThrow(
      'Invalid file path for import preview.',
    );

    expect(() => importHandler({}, null)).toThrow('Invalid payload for import operations.');
    expect(
      () =>
        importHandler({}, {
          broker: 'XP',
          totalOperationalCosts: 1,
          operations: [],
        }),
    ).toThrow('Invalid trade date for import operations.');
    expect(
      () =>
        importHandler({}, {
          tradeDate: '2025-01-01',
          broker: '',
          totalOperationalCosts: 1,
          operations: [],
        }),
    ).toThrow('Invalid broker for import operations.');
    expect(
      () =>
        importHandler({}, {
          tradeDate: '2025-01-01',
          broker: 'XP',
          totalOperationalCosts: Number.NaN,
          operations: [],
        }),
    ).toThrow('Invalid operational costs for import operations.');
    expect(
      () =>
        importHandler({}, {
          tradeDate: '2025-01-01',
          broker: 'XP',
          totalOperationalCosts: 1,
          operations: null,
        }),
    ).toThrow('Invalid operations list for import operations.');

    expect(() => confirmHandler({}, null)).toThrow('Invalid payload for confirm import operations.');
    expect(() => confirmHandler({}, { commands: null })).toThrow(
      'Invalid commands list for confirm import operations.',
    );

    expect(() => setInitialBalanceHandler({}, null)).toThrow('Invalid payload for initial balance.');
    expect(
      () =>
        setInitialBalanceHandler({}, {
          ticker: '',
          brokerId: 'broker-xp',
          assetType: AssetType.Stock,
          quantity: 1,
          averagePrice: 10,
        }),
    ).toThrow('Invalid ticker for initial balance.');
    expect(
      () =>
        setInitialBalanceHandler({}, {
          ticker: 'PETR4',
          brokerId: '',
          assetType: AssetType.Stock,
          quantity: 1,
          averagePrice: 10,
        }),
    ).toThrow('Invalid broker for initial balance.');
    expect(
      () =>
        setInitialBalanceHandler({}, {
          ticker: 'PETR4',
          brokerId: 'broker-xp',
          assetType: 'invalid' as AssetType,
          quantity: 1,
          averagePrice: 10,
        }),
    ).toThrow('Invalid asset type for initial balance.');
    expect(
      () =>
        setInitialBalanceHandler({}, {
          ticker: 'PETR4',
          brokerId: 'broker-xp',
          assetType: AssetType.Stock,
          quantity: Number.NaN,
          averagePrice: 10,
        }),
    ).toThrow('Invalid quantity for initial balance.');
    expect(
      () =>
        setInitialBalanceHandler({}, {
          ticker: 'PETR4',
          brokerId: 'broker-xp',
          assetType: AssetType.Stock,
          quantity: 1,
          averagePrice: Number.NaN,
        }),
    ).toThrow('Invalid average price for initial balance.');

    expect(() => reportHandler({}, null)).toThrow('Invalid payload for assets report.');
    expect(() => reportHandler({}, { baseYear: 2025.2 })).toThrow(
      'Invalid base year for assets report.',
    );

    expect(dependencies.previewImportFromFile).not.toHaveBeenCalled();
    expect(dependencies.importOperations).not.toHaveBeenCalled();
    expect(dependencies.confirmImportOperations).not.toHaveBeenCalled();
    expect(dependencies.setInitialBalance).not.toHaveBeenCalled();
    expect(dependencies.generateAssetsReport).not.toHaveBeenCalled();
  });
});
