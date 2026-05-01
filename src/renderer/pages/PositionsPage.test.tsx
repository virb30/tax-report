import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetType } from '../../shared/types/domain';
import type { ListPositionsResult } from '../../preload/contracts/portfolio/list-positions.contract';
import type { ElectronApi } from '../../preload/renderer/electron-api';
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

function createElectronApiMock(electronApiBaseMock: MockProxy<ElectronApi>): ElectronApi {
  mockReset(electronApiBaseMock);
  return {
    appName: 'tax-report',
    importSelectFile: electronApiBaseMock.importSelectFile,
    previewImportTransactions: electronApiBaseMock.previewImportTransactions,
    confirmImportTransactions: electronApiBaseMock.confirmImportTransactions,
    saveInitialBalanceDocument: electronApiBaseMock.saveInitialBalanceDocument,
    listInitialBalanceDocuments: electronApiBaseMock.listInitialBalanceDocuments,
    deleteInitialBalanceDocument: electronApiBaseMock.deleteInitialBalanceDocument,
    listPositions: electronApiBaseMock.listPositions,
    generateAssetsReport: electronApiBaseMock.generateAssetsReport,
    listAssets: electronApiBaseMock.listAssets,
    updateAsset: electronApiBaseMock.updateAsset,
    repairAssetType: electronApiBaseMock.repairAssetType,
    listBrokers: electronApiBaseMock.listBrokers,
    createBroker: electronApiBaseMock.createBroker,
    updateBroker: electronApiBaseMock.updateBroker,
    toggleBrokerActive: electronApiBaseMock.toggleBrokerActive,
    recalculatePosition: electronApiBaseMock.recalculatePosition,
    migrateYear: electronApiBaseMock.migrateYear,
    previewConsolidatedPosition: electronApiBaseMock.previewConsolidatedPosition,
    importConsolidatedPosition: electronApiBaseMock.importConsolidatedPosition,
    deletePosition: electronApiBaseMock.deletePosition,
    deleteAllPositions: electronApiBaseMock.deleteAllPositions,
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
          totalQuantity: 10,
          averagePrice: 30,
          totalCost: 300,
          brokerBreakdown: [
            {
              brokerId: 'broker-xp',
              brokerName: 'XP',
              brokerCnpj: '00.000.000/0001-00',
              quantity: 10,
            },
          ],
        },
        {
          ticker: 'VALE3',
          assetType: AssetType.Stock,
          totalQuantity: 5,
          averagePrice: 60,
          totalCost: 300,
          brokerBreakdown: [],
        },
      ],
    },
  };
}

describe('PositionsPage', () => {
  const electronApi = mock<ElectronApi>();
  let windowElectronApi: ElectronApi;

  beforeEach(() => {
    mockReset(electronApi);
    windowElectronApi = createElectronApiMock(electronApi);
    window.electronApi = windowElectronApi;

    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('loads positions and expands broker breakdown details', async () => {
    electronApi.listPositions.mockResolvedValue(createPositionsResult());

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
    electronApi.listPositions.mockResolvedValue({
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
      .mocked(electronApi.listPositions)
      .mockResolvedValueOnce(createPositionsResult())
      .mockResolvedValueOnce(createPositionsResult());
    jest.mocked(electronApi.recalculatePosition).mockResolvedValue({ ok: true, data: undefined });

    const user = userEvent.setup();
    render(<PositionsPage />);

    const recalculateAllButton = getButton('Recalcular todas');
    await waitFor(() => {
      expect(recalculateAllButton.disabled).toBe(false);
    });

    await user.click(recalculateAllButton);

    await waitFor(() => {
      expect(electronApi.recalculatePosition).toHaveBeenCalledTimes(2);
    });
    expect(electronApi.recalculatePosition).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: 'PETR4', year: expect.any(Number) }),
    );
    expect(electronApi.recalculatePosition).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: 'VALE3', year: expect.any(Number) }),
    );
    expect(electronApi.listPositions).toHaveBeenCalledTimes(2);
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
      .mocked(electronApi.listPositions)
      .mockResolvedValueOnce(positionsResult)
      .mockResolvedValueOnce({
        ok: true,
        data: { items: [remainingPosition] },
      });
    jest
      .mocked(electronApi.deletePosition)
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
      expect(electronApi.deletePosition).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: 'PETR4', year: expect.any(Number) }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText('PETR4')).toBeNull();
    });
  });

  it('deletes all positions for the selected year after confirmation and reloads the list', async () => {
    jest
      .mocked(electronApi.listPositions)
      .mockResolvedValueOnce(createPositionsResult())
      .mockResolvedValueOnce({ ok: true, data: { items: [] } });
    jest
      .mocked(electronApi.deleteAllPositions)
      .mockResolvedValue({ ok: true, data: { deletedCount: 2 } });

    const user = userEvent.setup();
    render(<PositionsPage />);

    const deleteAllButton = getButton('Excluir todos');
    await waitFor(() => {
      expect(deleteAllButton.disabled).toBe(false);
    });

    await user.click(deleteAllButton);

    await waitFor(() => {
      expect(electronApi.deleteAllPositions).toHaveBeenCalledWith({
        year: expect.any(Number),
      });
    });
    await waitFor(() => {
      expect(screen.queryByText('PETR4')).toBeNull();
      expect(screen.queryByText('VALE3')).toBeNull();
    });
  });

  it('displays migration failure messages from result envelopes', async () => {
    electronApi.listPositions.mockResolvedValue({ ok: true, data: { items: [] } });
    electronApi.migrateYear.mockResolvedValue({
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
      expect(electronApi.listPositions).toHaveBeenCalledTimes(1);
    });

    await user.click(getButton('Migrar posições entre anos'));
    await user.click(getButton('Migrar posições'));

    await waitFor(() => {
      expect(screen.getByText('Não há posições para migrar.')).toBeTruthy();
    });
  });
});
