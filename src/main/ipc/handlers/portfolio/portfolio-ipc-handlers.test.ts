import { mock, mockReset } from 'jest-mock-extended';
import type { DeletePositionUseCase } from '../../../application/use-cases/delete-position/delete-position.use-case';
import type { ImportConsolidatedPositionUseCase } from '../../../application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import type { ListPositionsUseCase } from '../../../application/use-cases/list-positions/list-positions-use-case';
import type { MigrateYearUseCase } from '../../../application/use-cases/migrate-year/migrate-year.use-case';
import type { RecalculatePositionUseCase } from '../../../application/use-cases/recalculate-position/recalculate-position.use-case';
import type { SetInitialBalanceUseCase } from '../../../application/use-cases/set-initial-balance/set-initial-balance.use-case';
import { AssetType } from '../../../../shared/types/domain';
import { createPortfolioIpcHandlers } from './portfolio-ipc-handlers';

describe('createPortfolioIpcHandlers', () => {
  const setInitialBalanceUseCase = mock<SetInitialBalanceUseCase>();
  const listPositionsUseCase = mock<ListPositionsUseCase>();
  const recalculatePositionUseCase = mock<RecalculatePositionUseCase>();
  const migrateYearUseCase = mock<MigrateYearUseCase>();
  const importConsolidatedPositionUseCase = mock<ImportConsolidatedPositionUseCase>();
  const deletePositionUseCase = mock<DeletePositionUseCase>();

  beforeEach(() => {
    mockReset(setInitialBalanceUseCase);
    mockReset(listPositionsUseCase);
    mockReset(recalculatePositionUseCase);
    mockReset(migrateYearUseCase);
    mockReset(importConsolidatedPositionUseCase);
    mockReset(deletePositionUseCase);
  });

  function createHandlers() {
    return createPortfolioIpcHandlers(
      setInitialBalanceUseCase,
      listPositionsUseCase,
      recalculatePositionUseCase,
      migrateYearUseCase,
      importConsolidatedPositionUseCase,
      deletePositionUseCase,
    );
  }

  it('returns list positions as an ok result with mapped list data and preserved asset types', async () => {
    listPositionsUseCase.execute.mockResolvedValue({
      items: [
        {
          ticker: 'IVVB11',
          assetType: AssetType.Etf,
          totalQuantity: 3,
          averagePrice: 250,
          totalCost: 750,
          brokerBreakdown: [
            {
              brokerId: 'broker-xp',
              brokerName: 'XP',
              brokerCnpj: '12.345.678/0001-90',
              quantity: 3,
            },
          ],
        },
      ],
    });
    const handlers = createHandlers();

    await expect(handlers.listPositions({ baseYear: 2025 })).resolves.toEqual({
      ok: true,
      data: {
        items: [
          {
            ticker: 'IVVB11',
            assetType: AssetType.Etf,
            totalQuantity: 3,
            averagePrice: 250,
            totalCost: 750,
            brokerBreakdown: [
              {
                brokerId: 'broker-xp',
                brokerName: 'XP',
                brokerCnpj: '12.345.678/0001-90',
                quantity: 3,
              },
            ],
          },
        ],
      },
    });
  });

  it('returns set initial balance as an ok result with use-case output data', async () => {
    setInitialBalanceUseCase.execute.mockResolvedValue({
      ticker: 'PETR4',
      brokerId: 'broker-xp',
      quantity: 10,
      averagePrice: 30,
    });
    const handlers = createHandlers();

    await expect(
      handlers.setInitialBalance({
        ticker: 'PETR4',
        brokerId: 'broker-xp',
        assetType: AssetType.Stock,
        quantity: 10,
        averagePrice: 30,
        year: 2025,
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        ticker: 'PETR4',
        brokerId: 'broker-xp',
        quantity: 10,
        averagePrice: 30,
      },
    });
  });

  it('returns recalculate position as an ok result with an empty payload', async () => {
    recalculatePositionUseCase.execute.mockResolvedValue({
      totalQuantity: 10,
      averagePrice: 30,
    });
    const handlers = createHandlers();

    await expect(handlers.recalculatePosition({ ticker: 'PETR4', year: 2025 })).resolves.toEqual({
      ok: true,
      data: undefined,
    });
  });

  it('returns ok results for the remaining portfolio commands', async () => {
    migrateYearUseCase.execute.mockResolvedValue({
      migratedPositionsCount: 2,
      createdTransactionsCount: 3,
    });
    importConsolidatedPositionUseCase.preview.mockResolvedValue({
      rows: [
        {
          ticker: 'BBAS3',
          quantity: 4,
          averagePrice: 20,
          brokerCode: 'XP',
          sourceAssetType: null,
          resolvedAssetType: null,
          resolutionStatus: 'unresolved',
          needsReview: true,
          unsupportedReason: null,
        },
      ],
      summary: {
        supportedRows: 1,
        pendingRows: 1,
        unsupportedRows: 0,
      },
    });
    importConsolidatedPositionUseCase.execute.mockResolvedValue({
      importedCount: 1,
      recalculatedTickers: ['BBAS3'],
    });
    deletePositionUseCase.execute.mockResolvedValue({ deleted: true });
    deletePositionUseCase.executeAll.mockResolvedValue({ deletedCount: 2 });
    const handlers = createHandlers();

    await expect(handlers.migrateYear({ sourceYear: 2024, targetYear: 2025 })).resolves.toEqual({
      ok: true,
      data: { migratedPositionsCount: 2, createdTransactionsCount: 3 },
    });
    await expect(
      handlers.previewConsolidatedPosition({ filePath: 'positions.csv' }),
    ).resolves.toEqual({
      ok: true,
      data: {
        rows: [
          {
            ticker: 'BBAS3',
            quantity: 4,
            averagePrice: 20,
            brokerCode: 'XP',
            sourceAssetType: null,
            resolvedAssetType: null,
            resolutionStatus: 'unresolved',
            needsReview: true,
            unsupportedReason: null,
          },
        ],
        summary: {
          supportedRows: 1,
          pendingRows: 1,
          unsupportedRows: 0,
        },
      },
    });
    await expect(
      handlers.importConsolidatedPosition({ filePath: 'positions.csv', year: 2025 }),
    ).resolves.toEqual({
      ok: true,
      data: { importedCount: 1, recalculatedTickers: ['BBAS3'] },
    });
    await expect(handlers.deletePosition({ ticker: 'BBAS3', year: 2025 })).resolves.toEqual({
      ok: true,
      data: { deleted: true },
    });
    await expect(handlers.deleteAllPositions({ year: 2025 })).resolves.toEqual({
      ok: true,
      data: { deletedCount: 2 },
    });
  });
});
