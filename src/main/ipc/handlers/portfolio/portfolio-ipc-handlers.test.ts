import { mock, mockReset } from 'jest-mock-extended';
import type { DeleteInitialBalanceDocumentUseCase } from '../../../application/use-cases/delete-initial-balance-document/delete-initial-balance-document.use-case';
import type { DeletePositionUseCase } from '../../../application/use-cases/delete-position/delete-position.use-case';
import type { ImportConsolidatedPositionUseCase } from '../../../application/use-cases/import-consolidated-position/import-consolidated-position-use-case';
import type { ListInitialBalanceDocumentsUseCase } from '../../../application/use-cases/list-initial-balance-documents/list-initial-balance-documents.use-case';
import type { ListPositionsUseCase } from '../../../application/use-cases/list-positions/list-positions-use-case';
import type { MigrateYearUseCase } from '../../../application/use-cases/migrate-year/migrate-year.use-case';
import type { RecalculatePositionUseCase } from '../../../application/use-cases/recalculate-position/recalculate-position.use-case';
import type { SaveInitialBalanceDocumentUseCase } from '../../../application/use-cases/save-initial-balance-document/save-initial-balance-document.use-case';
import { AssetResolutionStatus, AssetType } from '../../../../shared/types/domain';
import { createPortfolioIpcHandlers } from './portfolio-ipc-handlers';

describe('createPortfolioIpcHandlers', () => {
  const saveInitialBalanceDocumentUseCase = mock<SaveInitialBalanceDocumentUseCase>();
  const listInitialBalanceDocumentsUseCase = mock<ListInitialBalanceDocumentsUseCase>();
  const deleteInitialBalanceDocumentUseCase = mock<DeleteInitialBalanceDocumentUseCase>();
  const listPositionsUseCase = mock<ListPositionsUseCase>();
  const recalculatePositionUseCase = mock<RecalculatePositionUseCase>();
  const migrateYearUseCase = mock<MigrateYearUseCase>();
  const importConsolidatedPositionUseCase = mock<ImportConsolidatedPositionUseCase>();
  const deletePositionUseCase = mock<DeletePositionUseCase>();

  beforeEach(() => {
    mockReset(saveInitialBalanceDocumentUseCase);
    mockReset(listInitialBalanceDocumentsUseCase);
    mockReset(deleteInitialBalanceDocumentUseCase);
    mockReset(listPositionsUseCase);
    mockReset(recalculatePositionUseCase);
    mockReset(migrateYearUseCase);
    mockReset(importConsolidatedPositionUseCase);
    mockReset(deletePositionUseCase);
  });

  function createHandlers() {
    return createPortfolioIpcHandlers(
      saveInitialBalanceDocumentUseCase,
      listInitialBalanceDocumentsUseCase,
      deleteInitialBalanceDocumentUseCase,
      listPositionsUseCase,
      recalculatePositionUseCase,
      migrateYearUseCase,
      importConsolidatedPositionUseCase,
      deletePositionUseCase,
    );
  }

  it('returns initial balance document handlers as ok results with use-case output data', async () => {
    saveInitialBalanceDocumentUseCase.execute.mockResolvedValue({
      ticker: 'PETR4',
      year: 2025,
      assetType: AssetType.Stock,
      name: 'Petrobras',
      cnpj: '33.000.167/0001-01',
      averagePrice: '30',
      allocations: [{ brokerId: 'broker-xp', quantity: '10' }],
      totalQuantity: '10',
    });
    listInitialBalanceDocumentsUseCase.execute.mockResolvedValue({
      items: [
        {
          ticker: 'PETR4',
          year: 2025,
          assetType: AssetType.Stock,
          name: 'Petrobras',
          cnpj: '33.000.167/0001-01',
          averagePrice: '30',
          allocations: [{ brokerId: 'broker-xp', quantity: '10' }],
          totalQuantity: '10',
        },
      ],
    });
    deleteInitialBalanceDocumentUseCase.execute.mockResolvedValue({ deleted: true });
    const handlers = createHandlers();

    await expect(
      handlers.saveInitialBalanceDocument({
        ticker: 'PETR4',
        year: 2025,
        assetType: AssetType.Stock,
        averagePrice: '30',
        name: 'Petrobras',
        cnpj: '33.000.167/0001-01',
        allocations: [{ brokerId: 'broker-xp', quantity: '10' }],
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        ticker: 'PETR4',
        year: 2025,
        assetType: AssetType.Stock,
        name: 'Petrobras',
        cnpj: '33.000.167/0001-01',
        averagePrice: '30',
        allocations: [{ brokerId: 'broker-xp', quantity: '10' }],
        totalQuantity: '10',
      },
    });
    await expect(handlers.listInitialBalanceDocuments({ year: 2025 })).resolves.toEqual({
      ok: true,
      data: {
        items: [
          {
            ticker: 'PETR4',
            year: 2025,
            assetType: AssetType.Stock,
            name: 'Petrobras',
            cnpj: '33.000.167/0001-01',
            averagePrice: '30',
            allocations: [{ brokerId: 'broker-xp', quantity: '10' }],
            totalQuantity: '10',
          },
        ],
      },
    });
    await expect(
      handlers.deleteInitialBalanceDocument({ ticker: 'PETR4', year: 2025 }),
    ).resolves.toEqual({
      ok: true,
      data: { deleted: true },
    });
  });

  it('returns list positions as an ok result with mapped list data and preserved asset types', async () => {
    listPositionsUseCase.execute.mockResolvedValue({
      items: [
        {
          ticker: 'IVVB11',
          assetType: AssetType.Etf,
          totalQuantity: '3',
          averagePrice: '250',
          totalCost: '750',
          brokerBreakdown: [
            {
              brokerId: 'broker-xp',
              brokerName: 'XP',
              brokerCnpj: '12.345.678/0001-90',
              quantity: '3',
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
            totalQuantity: '3',
            averagePrice: '250',
            totalCost: '750',
            brokerBreakdown: [
              {
                brokerId: 'broker-xp',
                brokerName: 'XP',
                brokerCnpj: '12.345.678/0001-90',
                quantity: '3',
              },
            ],
          },
        ],
      },
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
          resolutionStatus: AssetResolutionStatus.Unresolved,
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
      skippedUnsupportedRows: 0,
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
      handlers.importConsolidatedPosition({
        filePath: 'positions.csv',
        year: 2025,
        assetTypeOverrides: [],
      }),
    ).resolves.toEqual({
      ok: true,
      data: { importedCount: 1, recalculatedTickers: ['BBAS3'], skippedUnsupportedRows: 0 },
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
