import { describe, expect, it, jest } from '@jest/globals';
import { AssetType } from '../../../shared/types/domain';
import {
  registerMainHandlers,
  type MainHandlersDependencies,
} from './register-main-handlers';

describe('registerMainHandlers', () => {
  function createDependencies() {
    return {
      checkHealth: jest.fn<any>().mockReturnValue({ status: 'ok' }),
      importSelectFile: jest.fn<any>().mockResolvedValue({ filePath: null }),
      previewImportTransactions: jest.fn<any>().mockResolvedValue({
        batches: [],
        transactionsPreview: [],
      }),
      confirmImportTransactions: jest.fn<any>().mockResolvedValue({
        importedCount: 2,
        recalculatedTickers: ['PETR4'],
      }),
      setInitialBalance: jest.fn<any>().mockResolvedValue({
        ticker: 'PETR4',
        brokerId: 'broker-xp',
        quantity: 10,
        averagePrice: 20,
      }),
      listPositions: jest.fn<any>().mockResolvedValue({
        items: [],
      }),
      generateAssetsReport: jest.fn<any>().mockResolvedValue({
        referenceDate: '2025-12-31',
        items: [],
      }),
      recalculatePosition: jest.fn<any>().mockResolvedValue(undefined),
      migrateYear: jest.fn<any>().mockResolvedValue({
        migratedPositionsCount: 2,
        createdTransactionsCount: 4,
      }),
      previewConsolidatedPosition: jest.fn<any>().mockResolvedValue({ rows: [] }),
      importConsolidatedPosition: jest.fn<any>().mockResolvedValue({
        importedCount: 2,
        recalculatedTickers: ['PETR4'],
      }),
      deletePosition: jest.fn<any>().mockResolvedValue({ deleted: true }),
    };
  }

  it('registers all channels and returns channel list', () => {
    const handle = jest.fn();
    const dependencies = createDependencies();

    const channels = registerMainHandlers({ handle }, dependencies as MainHandlersDependencies);

    expect(channels).toEqual([
      'app:health-check',
      'import:select-file',
      'import:preview-transactions',
      'import:confirm-transactions',
      'portfolio:set-initial-balance',
      'portfolio:list-positions',
      'portfolio:recalculate',
      'portfolio:migrate-year',
      'portfolio:preview-consolidated-position',
      'portfolio:import-consolidated-position',
      'portfolio:delete-position',
      'report:assets-annual',
    ]);
    expect(handle).toHaveBeenCalledTimes(12);
    expect(handle).toHaveBeenCalledWith('app:health-check', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('import:preview-transactions', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('import:confirm-transactions', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('portfolio:set-initial-balance', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('portfolio:list-positions', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('portfolio:recalculate', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('portfolio:migrate-year', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('report:assets-annual', expect.any(Function));
  });

  it('delegates payload handling to dependencies', async () => {
    const handle = jest.fn();
    const dependencies = createDependencies();
    registerMainHandlers({ handle }, dependencies as MainHandlersDependencies);

    const healthHandler = handle.mock.calls[0]?.[1] as (() => unknown) | undefined;
    const previewHandler = handle.mock.calls[2]?.[1] as
      | ((_event: unknown, input: { filePath: string }) => Promise<unknown>)
      | undefined;
    const confirmHandler = handle.mock.calls[3]?.[1] as
      | ((_event: unknown, input: unknown) => Promise<unknown>)
      | undefined;
    const setInitialBalanceHandler = handle.mock.calls[4]?.[1] as
      | ((_event: unknown, input: unknown) => Promise<unknown>)
      | undefined;
    const listPositionsHandler = handle.mock.calls[5]?.[1] as
      | ((_event: unknown, input: { baseYear: number }) => Promise<unknown>)
      | undefined;
    const recalculateHandler = handle.mock.calls[6]?.[1] as
      | ((_event: unknown, input: { ticker: string }) => Promise<unknown>)
      | undefined;
    const migrateYearHandler = handle.mock.calls[7]?.[1] as
      | ((_event: unknown, input: { sourceYear: number; targetYear: number }) => Promise<unknown>)
      | undefined;
    const reportHandler = handle.mock.calls[11]?.[1] as
      | ((_event: unknown, input: { baseYear: number }) => Promise<unknown>)
      | undefined;

    if (
      !healthHandler ||
      !previewHandler ||
      !confirmHandler ||
      !setInitialBalanceHandler ||
      !listPositionsHandler ||
      !recalculateHandler ||
      !migrateYearHandler ||
      !reportHandler
    ) {
      throw new Error('IPC handlers were not fully registered.');
    }

    const previewInput = {
      filePath: '/tmp/operations.csv',
    };
    const confirmInput = { filePath: '/tmp/operations.csv' };
    const initialBalanceInput = {
      ticker: 'ITSA4',
      brokerId: 'broker-xp',
      assetType: AssetType.Stock,
      quantity: 20,
      averagePrice: 10,
      year: 2025,
    };
    const reportInput = { baseYear: 2025 };
    const recalculateInput = { ticker: 'PETR4', year: 2025 };
    const migrateYearInput = { sourceYear: 2024, targetYear: 2025 };

    expect(healthHandler()).toEqual({ status: 'ok' });
    await previewHandler({}, previewInput);
    await confirmHandler({}, confirmInput);
    await setInitialBalanceHandler({}, initialBalanceInput);
    await listPositionsHandler({}, { baseYear: 2025 });
    await recalculateHandler({}, recalculateInput);
    await migrateYearHandler({}, migrateYearInput);
    await reportHandler({}, reportInput);

    expect(dependencies.checkHealth).toHaveBeenCalledTimes(1);
    expect(dependencies.previewImportTransactions).toHaveBeenCalledWith(previewInput);
    expect(dependencies.confirmImportTransactions).toHaveBeenCalledWith(confirmInput);
    expect(dependencies.setInitialBalance).toHaveBeenCalledWith(initialBalanceInput);
    expect(dependencies.listPositions).toHaveBeenCalledWith({ baseYear: 2025 });
    expect(dependencies.recalculatePosition).toHaveBeenCalledWith(recalculateInput);
    expect(dependencies.migrateYear).toHaveBeenCalledWith(migrateYearInput);
    expect(dependencies.generateAssetsReport).toHaveBeenCalledWith(reportInput);
  });

  it('rejects invalid payloads before invoking dependencies', () => {
    const handle = jest.fn();
    const dependencies = createDependencies();
    registerMainHandlers({ handle }, dependencies as MainHandlersDependencies);

    const previewHandler = handle.mock.calls[2]?.[1] as (_event: unknown, input: unknown) => unknown;
    const confirmHandler = handle.mock.calls[3]?.[1] as (_event: unknown, input: unknown) => unknown;
    const setInitialBalanceHandler = handle.mock.calls[4]?.[1] as (_event: unknown, input: unknown) => unknown;
    const reportHandler = handle.mock.calls[11]?.[1] as (_event: unknown, input: unknown) => unknown;

    expect(() => previewHandler({}, null)).toThrow('Invalid payload for preview import transactions.');
    expect(() => previewHandler({}, { broker: 'XP', filePath: '' })).toThrow(
      'Invalid file path for preview import transactions.',
    );

    expect(() => confirmHandler({}, null)).toThrow('Invalid payload for confirm import transactions.');
    expect(() => confirmHandler({}, { filePath: null })).toThrow(
      'Invalid file path for confirm import transactions.',
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
          year: 2025,
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
          year: 2025,
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
          year: 2025,
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
          year: 2025,
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
          year: 2025,
        }),
    ).toThrow('Invalid average price for initial balance.');

    expect(() => reportHandler({}, null)).toThrow('Invalid payload for assets report.');
    expect(() => reportHandler({}, { baseYear: 2025.2 })).toThrow(
      'Invalid base year for assets report.',
    );

    expect(dependencies.previewImportTransactions).not.toHaveBeenCalled();
    expect(dependencies.confirmImportTransactions).not.toHaveBeenCalled();
    expect(dependencies.setInitialBalance).not.toHaveBeenCalled();
    expect(dependencies.generateAssetsReport).not.toHaveBeenCalled();
  });
});
