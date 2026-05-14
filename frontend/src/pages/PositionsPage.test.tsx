import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetType } from '@/types/api.types';
import type { ListPositionsResult } from '@/types/api.types';
import type { TaxReportApi } from '@/services/api/tax-report-api';
import { setTaxReportApiForTesting } from '@/services/api/tax-report-api-provider';
import { PositionsPage } from './PositionsPage';
import { mockReset } from 'jest-mock-extended';
import mock, { type MockProxy } from 'jest-mock-extended/lib/Mock';

function getButton(name: string): HTMLButtonElement {
  const element = screen.getByRole('button', { name });
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Expected "${name}" to be a button element.`);
  }

  return element;
}

function createTaxReportApiMock(taxReportApiBaseMock: MockProxy<TaxReportApi>): TaxReportApi {
  mockReset(taxReportApiBaseMock);
  return {
    appName: 'tax-report',
    previewImportTransactions: taxReportApiBaseMock.previewImportTransactions,
    previewTransactionImport: taxReportApiBaseMock.previewTransactionImport,
    confirmImportTransactions: taxReportApiBaseMock.confirmImportTransactions,
    confirmTransactionImport: taxReportApiBaseMock.confirmTransactionImport,
    listDailyBrokerTaxes: taxReportApiBaseMock.listDailyBrokerTaxes,
    saveDailyBrokerTax: taxReportApiBaseMock.saveDailyBrokerTax,
    importDailyBrokerTaxes: taxReportApiBaseMock.importDailyBrokerTaxes,
    deleteDailyBrokerTax: taxReportApiBaseMock.deleteDailyBrokerTax,
    saveInitialBalanceDocument: taxReportApiBaseMock.saveInitialBalanceDocument,
    listInitialBalanceDocuments: taxReportApiBaseMock.listInitialBalanceDocuments,
    deleteInitialBalanceDocument: taxReportApiBaseMock.deleteInitialBalanceDocument,
    listPositions: taxReportApiBaseMock.listPositions,
    generateAssetsReport: taxReportApiBaseMock.generateAssetsReport,
    listMonthlyTaxHistory: taxReportApiBaseMock.listMonthlyTaxHistory,
    getMonthlyTaxDetail: taxReportApiBaseMock.getMonthlyTaxDetail,
    recalculateMonthlyTaxHistory: taxReportApiBaseMock.recalculateMonthlyTaxHistory,
    listAssets: taxReportApiBaseMock.listAssets,
    updateAsset: taxReportApiBaseMock.updateAsset,
    repairAssetType: taxReportApiBaseMock.repairAssetType,
    listBrokers: taxReportApiBaseMock.listBrokers,
    createBroker: taxReportApiBaseMock.createBroker,
    updateBroker: taxReportApiBaseMock.updateBroker,
    toggleBrokerActive: taxReportApiBaseMock.toggleBrokerActive,
    recalculatePosition: taxReportApiBaseMock.recalculatePosition,
    migrateYear: taxReportApiBaseMock.migrateYear,
    previewConsolidatedPosition: taxReportApiBaseMock.previewConsolidatedPosition,
    importConsolidatedPosition: taxReportApiBaseMock.importConsolidatedPosition,
    deletePosition: taxReportApiBaseMock.deletePosition,
    deleteAllPositions: taxReportApiBaseMock.deleteAllPositions,
  };
}

function createPositionsResult(): ListPositionsResult {
  return {
    ok: true,
    data: {
      items: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          totalQuantity: '10',
          averagePrice: '30',
          totalCost: '300',
          brokerBreakdown: [
            {
              brokerId: 'broker-xp',
              brokerName: 'XP',
              brokerCnpj: '00.000.000/0001-00',
              quantity: '10',
            },
          ],
        },
        {
          ticker: 'VALE3',
          assetType: AssetType.Stock,
          totalQuantity: '5',
          averagePrice: '60',
          totalCost: '300',
          brokerBreakdown: [],
        },
      ],
    },
  };
}

describe('PositionsPage', () => {
  const taxReportApi = mock<TaxReportApi>();
  let taxReportApiMock: TaxReportApi;

  beforeEach(() => {
    mockReset(taxReportApi);
    taxReportApiMock = createTaxReportApiMock(taxReportApi);
    setTaxReportApiForTesting(taxReportApiMock);

    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('loads positions and expands broker breakdown details', async () => {
    taxReportApi.listPositions.mockResolvedValue(createPositionsResult());

    const user = userEvent.setup();
    render(<PositionsPage />);

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeTruthy();
    });

    await user.click(screen.getByText('PETR4'));

    expect(screen.getByText('Por corretora')).toBeTruthy();
    expect(screen.getByText('XP')).toBeTruthy();
    expect(screen.getByText('00.000.000/0001-00')).toBeTruthy();
  });

  it('displays list failure messages from result envelopes', async () => {
    taxReportApi.listPositions.mockResolvedValue({
      ok: false,
      error: {
        code: 'LIST_POSITIONS_FAILED',
        kind: 'business',
        message: 'Não foi possível carregar as posições.',
      },
    });

    render(<PositionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar as posições.')).toBeTruthy();
    });
  });

  it('recalculates all positions and reloads the list', async () => {
    jest
      .mocked(taxReportApi.listPositions)
      .mockResolvedValueOnce(createPositionsResult())
      .mockResolvedValueOnce(createPositionsResult());
    jest.mocked(taxReportApi.recalculatePosition).mockResolvedValue({ ok: true, data: undefined });

    const user = userEvent.setup();
    render(<PositionsPage />);

    const recalculateAllButton = getButton('Recalcular todas');
    await waitFor(() => {
      expect(recalculateAllButton.disabled).toBe(false);
    });

    await user.click(recalculateAllButton);

    await waitFor(() => {
      expect(taxReportApi.recalculatePosition).toHaveBeenCalledTimes(2);
    });
    expect(taxReportApi.recalculatePosition).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: 'PETR4', year: expect.any(Number) }),
    );
    expect(taxReportApi.recalculatePosition).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: 'VALE3', year: expect.any(Number) }),
    );
    expect(taxReportApi.listPositions).toHaveBeenCalledTimes(2);
  });

  it('shows include fees as the default average price mode', async () => {
    taxReportApi.listPositions.mockResolvedValue(createPositionsResult());

    render(<PositionsPage />);

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeTruthy();
    });

    expect(getButton('Considerar').getAttribute('aria-pressed')).toBe('true');
    expect(getButton('Ignorar').getAttribute('aria-pressed')).toBe('false');
  });

  it('recalculates all positions with ignored fees when selected', async () => {
    jest
      .mocked(taxReportApi.listPositions)
      .mockResolvedValueOnce(createPositionsResult())
      .mockResolvedValueOnce(createPositionsResult());
    jest.mocked(taxReportApi.recalculatePosition).mockResolvedValue({ ok: true, data: undefined });

    const user = userEvent.setup();
    render(<PositionsPage />);

    const recalculateAllButton = getButton('Recalcular todas');
    await waitFor(() => {
      expect(recalculateAllButton.disabled).toBe(false);
    });

    await user.click(getButton('Ignorar'));
    await user.click(recalculateAllButton);

    await waitFor(() => {
      expect(taxReportApi.recalculatePosition).toHaveBeenCalledTimes(2);
    });
    expect(taxReportApi.recalculatePosition).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: 'PETR4',
        year: expect.any(Number),
        averagePriceFeeMode: 'ignore',
      }),
    );
    expect(taxReportApi.recalculatePosition).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: 'VALE3',
        year: expect.any(Number),
        averagePriceFeeMode: 'ignore',
      }),
    );
  });

  it('recalculates an individual position with ignored fees when selected', async () => {
    jest
      .mocked(taxReportApi.listPositions)
      .mockResolvedValueOnce(createPositionsResult())
      .mockResolvedValueOnce(createPositionsResult());
    jest.mocked(taxReportApi.recalculatePosition).mockResolvedValue({ ok: true, data: undefined });

    const user = userEvent.setup();
    render(<PositionsPage />);

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeTruthy();
    });

    await user.click(getButton('Ignorar'));
    const recalculateButton = screen.getAllByRole('button', { name: 'Recalcular' })[0];
    if (!(recalculateButton instanceof HTMLButtonElement)) {
      throw new Error('Expected recalculate control to be a button element.');
    }

    await user.click(recalculateButton);

    await waitFor(() => {
      expect(taxReportApi.recalculatePosition).toHaveBeenCalledWith({
        ticker: 'PETR4',
        year: expect.any(Number),
        averagePriceFeeMode: 'ignore',
      });
    });
  });

  it('deletes a position after confirmation and reloads the list', async () => {
    const positionsResult = createPositionsResult();
    if (!positionsResult.ok) {
      throw new Error('Expected positions fixture to be an ok result.');
    }
    const remainingPosition = positionsResult.data.items[1];
    if (remainingPosition == null) {
      throw new Error('Expected a second position in the fixture.');
    }

    jest
      .mocked(taxReportApi.listPositions)
      .mockResolvedValueOnce(positionsResult)
      .mockResolvedValueOnce({
        ok: true,
        data: { items: [remainingPosition] },
      });
    jest
      .mocked(taxReportApi.deletePosition)
      .mockResolvedValue({ ok: true, data: { deleted: true } });

    const user = userEvent.setup();
    render(<PositionsPage />);

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeTruthy();
    });

    const deleteButton = screen.getAllByRole('button', { name: 'Excluir' })[0];
    if (!(deleteButton instanceof HTMLButtonElement)) {
      throw new Error('Expected delete control to be a button element.');
    }

    await user.click(deleteButton);

    await waitFor(() => {
      expect(taxReportApi.deletePosition).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: 'PETR4', year: expect.any(Number) }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText('PETR4')).toBeNull();
    });
  });

  it('deletes all positions for the selected year after confirmation and reloads the list', async () => {
    jest
      .mocked(taxReportApi.listPositions)
      .mockResolvedValueOnce(createPositionsResult())
      .mockResolvedValueOnce({ ok: true, data: { items: [] } });
    jest
      .mocked(taxReportApi.deleteAllPositions)
      .mockResolvedValue({ ok: true, data: { deletedCount: 2 } });

    const user = userEvent.setup();
    render(<PositionsPage />);

    const deleteAllButton = getButton('Excluir todos');
    await waitFor(() => {
      expect(deleteAllButton.disabled).toBe(false);
    });

    await user.click(deleteAllButton);

    await waitFor(() => {
      expect(taxReportApi.deleteAllPositions).toHaveBeenCalledWith({
        year: expect.any(Number),
      });
    });
    await waitFor(() => {
      expect(screen.queryByText('PETR4')).toBeNull();
      expect(screen.queryByText('VALE3')).toBeNull();
    });
  });

  it('displays migration failure messages from result envelopes', async () => {
    taxReportApi.listPositions.mockResolvedValue({ ok: true, data: { items: [] } });
    taxReportApi.migrateYear.mockResolvedValue({
      ok: false,
      error: {
        code: 'MIGRATION_FAILED',
        kind: 'business',
        message: 'Não há posições para migrar.',
      },
    });

    const user = userEvent.setup();
    render(<PositionsPage />);

    await waitFor(() => {
      expect(taxReportApi.listPositions).toHaveBeenCalledTimes(1);
    });

    await user.click(getButton('Migrar posições entre anos'));
    await user.click(getButton('Migrar posições'));

    await waitFor(() => {
      expect(screen.getByText('Não há posições para migrar.')).toBeTruthy();
    });
  });
});
